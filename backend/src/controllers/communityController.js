import Joi from 'joi';
import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { serializePost, serializePosts, serializeComments } from '../utils/serializers.js';
import { logger } from '../utils/logger.js';

const MAX_LIMIT = 30;

/** Người chưa xác thực chỉ được đăng giới hạn ở bảng tin toàn quốc */
const GUEST_POSTS_PER_HOUR = 3;

const createPostSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required().messages({
    'string.min': 'Tiêu đề quá ngắn',
    'any.required': 'Vui lòng nhập tiêu đề',
  }),
  content: Joi.string().trim().min(1).max(3000).required().messages({
    'any.required': 'Vui lòng nhập nội dung',
  }),
  category: Joi.string()
    .valid('Academics', 'Student Life', 'Events', 'Q&A', 'General', 'Book Exchange', 'Study Group')
    .default('General'),
  isAnonymous: Joi.boolean().default(true),
  communityType: Joi.string().valid('global', 'university').default('university'),
  images: Joi.array().items(Joi.string().uri()).max(5).default([]),
});

const createCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required().messages({
    'any.required': 'Vui lòng nhập nội dung bình luận',
  }),
  isAnonymous: Joi.boolean().default(true),
  parentComment: Joi.string().hex().length(24).allow(null).default(null),
});

const isModerator = (user) =>
  (user.roles || []).some((r) => r === 'admin' || r === 'moderator');

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

const userUniversityId = (user) => String(user.university?._id || user.university || '');

/**
 * Kiểm tra quyền đọc một bài viết.
 *
 * Bài toàn quốc: ai đăng nhập cũng đọc được, kể cả chưa xác thực.
 * Bài của trường: bắt buộc đã xác thực VÀ đúng trường đó.
 *
 * Trả null nếu được phép, hoặc object lỗi nếu không.
 */
const postAccessError = (post, user) => {
  if (post.communityType !== 'university') return null;

  if (user.verificationStatus !== 'verified') {
    return {
      status: 403,
      code: 'UNIVERSITY_VERIFICATION_REQUIRED',
      message: 'Bạn cần xác thực email trường để xem nội dung này',
      currentStatus: user.verificationStatus,
    };
  }

  const postUni = String(post.university?._id || post.university || '');
  if (userUniversityId(user) !== postUni) {
    return {
      status: 403,
      code: 'WRONG_UNIVERSITY',
      message: 'Nội dung này chỉ dành cho sinh viên trường khác',
    };
  }

  return null;
};

/**
 * GET /api/community/feed
 * scope=global     → bảng tin liên trường, mở cho mọi người đã đăng nhập
 * scope=university → bảng tin riêng của trường, bắt buộc đã xác thực
 */
export const getFeed = async (req, res) => {
  const scope = req.query.scope === 'global' ? 'global' : 'university';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, parseInt(req.query.limit, 10) || 20);
  const { category } = req.query;

  const filter = { isDeleted: false, isApproved: true };

  if (scope === 'university') {
    if (req.user.verificationStatus !== 'verified') {
      return res.status(403).json({
        status: 'error',
        code: 'UNIVERSITY_VERIFICATION_REQUIRED',
        message: 'Bạn cần xác thực email trường để xem bảng tin này',
        currentStatus: req.user.verificationStatus,
      });
    }
    filter.university = req.user.university?._id || req.user.university;
    filter.communityType = 'university';
  } else {
    filter.communityType = 'global';
  }

  if (category) filter.category = category;

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('university', 'shortName name')
      .lean(),
    Post.countDocuments(filter),
  ]);

  // Chỉ nạp tác giả cho bài công khai — bài ẩn danh không đi qua nhánh này
  const publicPosts = posts.filter((p) => !p.isAnonymous);
  if (publicPosts.length) {
    const User = mongoose.model('User');
    const authors = await User.find({ _id: { $in: publicPosts.map((p) => p.author).filter(Boolean) } })
      .select('nickname profilePhoto')
      .lean();
    const byId = new Map(authors.map((a) => [String(a._id), a]));
    publicPosts.forEach((p) => {
      p.author = byId.get(String(p.author)) || null;
    });
  }

  const likedIds = await Post.find({
    _id: { $in: posts.map((p) => p._id) },
    likes: req.user._id,
  })
    .select('_id')
    .lean();
  const likedPostIds = new Set(likedIds.map((p) => String(p._id)));

  res.status(200).json({
    status: 'success',
    data: {
      scope,
      posts: serializePosts(posts, req.user._id, {
        likedPostIds,
        isModerator: isModerator(req.user),
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
};

/**
 * POST /api/community/posts
 * Guest đăng được ở bảng tin toàn quốc, nhưng có hạn mức chặt hơn.
 */
export const createPost = async (req, res) => {
  const { error, value } = createPostSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details.map((d) => d.message),
    });
  }

  const verified = req.user.verificationStatus === 'verified';
  const universityId = req.user.university?._id || req.user.university;

  if (value.communityType === 'university') {
    if (!verified || !universityId) {
      return res.status(403).json({
        status: 'error',
        code: 'UNIVERSITY_VERIFICATION_REQUIRED',
        message: 'Bạn cần xác thực email trường để đăng bài trong cộng đồng trường',
      });
    }
  } else if (!verified) {
    // Tài khoản chưa xác thực không có gì ràng buộc danh tính,
    // nên siết chặt hơn để tránh spam ở bảng tin mở
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await Post.countDocuments({
      author: req.user._id,
      createdAt: { $gte: anHourAgo },
    });

    if (recent >= GUEST_POSTS_PER_HOUR) {
      return res.status(429).json({
        status: 'error',
        code: 'GUEST_POST_LIMIT',
        message: `Tài khoản chưa xác thực chỉ đăng được ${GUEST_POSTS_PER_HOUR} bài mỗi giờ. Xác thực email trường để bỏ giới hạn này.`,
      });
    }
  }

  const post = await Post.create({
    ...value,
    author: req.user._id,
    university: value.communityType === 'university' ? universityId : null,
    lastActivityAt: new Date(),
  });

  logger.info(`Bài mới: ${post._id} (${value.communityType}, ẩn danh: ${post.isAnonymous})`);

  const populated = await Post.findById(post._id).populate('university', 'shortName name');

  res.status(201).json({
    status: 'success',
    message: 'Đăng bài thành công',
    data: { post: serializePost(populated, req.user._id) },
  });
};

/**
 * GET /api/community/posts/:id
 */
export const getPost = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).populate(
    'university',
    'shortName name'
  );

  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  const denied = postAccessError(post, req.user);
  if (denied) {
    return res.status(denied.status).json({ status: 'error', ...denied });
  }

  await Post.updateOne({ _id: post._id }, { $inc: { views: 1 } });

  if (!post.isAnonymous) {
    await post.populate({ path: 'author', select: 'nickname profilePhoto' });
  }

  const liked = await Post.exists({ _id: post._id, likes: req.user._id });

  res.status(200).json({
    status: 'success',
    data: {
      post: serializePost(post, req.user._id, {
        likedByMe: Boolean(liked),
        isModerator: isModerator(req.user),
      }),
    },
  });
};

/**
 * POST /api/community/posts/:id/like
 */
export const togglePostLike = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  const denied = postAccessError(post, req.user);
  if (denied) return res.status(denied.status).json({ status: 'error', ...denied });

  const already = await Post.exists({ _id: post._id, likes: req.user._id });

  // $addToSet / $pull tránh đếm sai khi bấm nhanh liên tục
  const update = already
    ? { $pull: { likes: req.user._id }, $inc: { likeCount: -1 } }
    : { $addToSet: { likes: req.user._id }, $inc: { likeCount: 1 } };

  const updated = await Post.findByIdAndUpdate(post._id, update, { new: true });

  res.status(200).json({
    status: 'success',
    data: { liked: !already, likeCount: Math.max(0, updated.likeCount) },
  });
};

/**
 * DELETE /api/community/posts/:id — xoá mềm, giữ lại để truy vết kiểm duyệt
 */
export const deletePost = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const post = await Post.findById(req.params.id).select('+author');
  if (!post || post.isDeleted) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  const isOwner = String(post.author) === String(req.user._id);
  if (!isOwner && !isModerator(req.user)) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Bạn không có quyền xoá bài này',
    });
  }

  post.isDeleted = true;
  post.deletedAt = new Date();
  post.deletedBy = req.user._id;
  await post.save();

  res.status(200).json({ status: 'success', message: 'Đã xoá bài viết' });
};

// ===== BÌNH LUẬN =====

/**
 * GET /api/community/posts/:id/comments
 */
export const getComments = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, parseInt(req.query.limit, 10) || 20);

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  // Không được để lọt: bình luận của bài trường cũng phải chặn như bài
  const denied = postAccessError(post, req.user);
  if (denied) return res.status(denied.status).json({ status: 'error', ...denied });

  const filter = { post: post._id, parentComment: null };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1 }) // cũ trước, đúng mạch hội thoại
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  const publicOnes = comments.filter((c) => !c.isAnonymous && c.author);
  if (publicOnes.length) {
    const User = mongoose.model('User');
    const authors = await User.find({ _id: { $in: publicOnes.map((c) => c.author) } })
      .select('nickname profilePhoto')
      .lean();
    const byId = new Map(authors.map((a) => [String(a._id), a]));
    publicOnes.forEach((c) => {
      c.author = byId.get(String(c.author)) || null;
    });
  }

  const likedIds = await Comment.find({
    _id: { $in: comments.map((c) => c._id) },
    likes: req.user._id,
  })
    .select('_id')
    .lean();
  const likedCommentIds = new Set(likedIds.map((c) => String(c._id)));

  res.status(200).json({
    status: 'success',
    data: {
      comments: serializeComments(comments, req.user._id, {
        likedCommentIds,
        isModerator: isModerator(req.user),
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
  });
};

/**
 * POST /api/community/posts/:id/comments
 */
export const createComment = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const { error, value } = createCommentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).select('+author');
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  const denied = postAccessError(post, req.user);
  if (denied) return res.status(denied.status).json({ status: 'error', ...denied });

  if (value.parentComment) {
    const parent = await Comment.findOne({
      _id: value.parentComment,
      post: post._id,
      isDeleted: false,
    });
    if (!parent) {
      return res.status(404).json({
        status: 'error',
        code: 'PARENT_NOT_FOUND',
        message: 'Bình luận gốc không tồn tại',
      });
    }
    // Chỉ cho lồng một cấp — sâu hơn rất khó đọc trên màn hình điện thoại
    if (parent.parentComment) value.parentComment = String(parent.parentComment);
  }

  const isPostAuthor = String(post.author) === String(req.user._id);

  let ordinal = null;
  if (value.isAnonymous && !isPostAuthor) {
    ordinal = await Post.resolveAnonymousOrdinal(post._id, req.user._id);
  }

  const comment = await Comment.create({
    post: post._id,
    author: req.user._id,
    text: value.text,
    isAnonymous: value.isAnonymous,
    anonymousOrdinal: ordinal,
    isPostAuthor,
    parentComment: value.parentComment || null,
  });

  await Post.updateOne(
    { _id: post._id },
    { $inc: { commentCount: 1 }, $set: { lastActivityAt: new Date() } }
  );

  if (value.parentComment) {
    await Comment.updateOne({ _id: value.parentComment }, { $inc: { replyCount: 1 } });
  }

  const out = comment.toObject();
  if (!value.isAnonymous) {
    out.author = {
      _id: req.user._id,
      nickname: req.user.nickname,
      profilePhoto: req.user.profilePhoto,
    };
  }

  res.status(201).json({
    status: 'success',
    message: 'Đã đăng bình luận',
    data: { comment: serializeComments([out], req.user._id)[0] },
  });
};

/**
 * DELETE /api/community/comments/:id
 */
export const deleteComment = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const comment = await Comment.findById(req.params.id).select('+author');
  if (!comment || comment.isDeleted) {
    return res.status(404).json({
      status: 'error',
      code: 'COMMENT_NOT_FOUND',
      message: 'Bình luận không tồn tại',
    });
  }

  const isOwner = String(comment.author) === String(req.user._id);
  if (!isOwner && !isModerator(req.user)) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Bạn không có quyền xoá bình luận này',
    });
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });

  res.status(200).json({ status: 'success', message: 'Đã xoá bình luận' });
};

/**
 * POST /api/community/comments/:id/like
 */
export const toggleCommentLike = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
  if (!comment) {
    return res.status(404).json({
      status: 'error',
      code: 'COMMENT_NOT_FOUND',
      message: 'Bình luận không tồn tại',
    });
  }

  const post = await Post.findById(comment.post);
  if (post) {
    const denied = postAccessError(post, req.user);
    if (denied) return res.status(denied.status).json({ status: 'error', ...denied });
  }

  const already = await Comment.exists({ _id: comment._id, likes: req.user._id });

  const update = already
    ? { $pull: { likes: req.user._id }, $inc: { likeCount: -1 } }
    : { $addToSet: { likes: req.user._id }, $inc: { likeCount: 1 } };

  const updated = await Comment.findByIdAndUpdate(comment._id, update, { new: true });

  res.status(200).json({
    status: 'success',
    data: { liked: !already, likeCount: Math.max(0, updated.likeCount) },
  });
};
