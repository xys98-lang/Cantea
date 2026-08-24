import Joi from 'joi';
import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Topic from '../models/Topic.js';
import Bookmark from '../models/Bookmark.js';
import {
  serializePost,
  serializePosts,
  serializeComments,
  serializeTopic,
} from '../utils/serializers.js';
import TrendingCache from '../models/TrendingCache.js';
import { logger } from '../utils/logger.js';
import { isModerator, postViewError } from '../utils/postAccess.js';

const MAX_LIMIT = 30;

/**
 * Hạn mức đăng bài cho tài khoản chưa xác thực.
 *
 * Tính theo NGÀY LỊCH giờ Việt Nam, không theo cửa sổ trượt 24 giờ.
 * Cửa sổ trượt gây khó hiểu: đăng lúc 23h hôm qua thì 8h sáng nay vẫn
 * hết lượt, người dùng không đoán được bao giờ mới đăng lại được.
 * Reset lúc nửa đêm thì ai cũng hiểu ngay.
 */
const GUEST_POSTS_PER_DAY = 3;

/** Mốc nửa đêm gần nhất theo giờ Việt Nam (UTC+7), trả về dạng UTC */
const startOfDayVN = () => {
  const shifted = new Date(Date.now() + 7 * 3600000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 7 * 3600000);
};

/** Nửa đêm kế tiếp — để báo cho người dùng biết khi nào có lượt lại */
const nextResetVN = () => new Date(startOfDayVN().getTime() + 24 * 3600000);

/** Số bài đã đăng trong ngày và số lượt còn lại */
const getQuota = async (user) => {
  if (user.verificationStatus === 'verified') {
    return { limited: false, limit: null, used: 0, remaining: null, resetsAt: null };
  }

  const used = await Post.countDocuments({
    author: user._id,
    isDeleted: false,
    createdAt: { $gte: startOfDayVN() },
  });

  return {
    limited: true,
    limit: GUEST_POSTS_PER_DAY,
    used,
    remaining: Math.max(0, GUEST_POSTS_PER_DAY - used),
    resetsAt: nextResetVN(),
  };
};

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
  topic: Joi.string().hex().length(24).allow(null, '').default(null),
  images: Joi.array().items(Joi.string().uri()).max(5).default([]),
});

const createCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required().messages({
    'any.required': 'Vui lòng nhập nội dung bình luận',
  }),
  isAnonymous: Joi.boolean().default(true),
  parentComment: Joi.string().hex().length(24).allow(null).default(null),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

/**
 * GET /api/community/feed
 * scope=global     → bảng tin liên trường, mở cho mọi người đã đăng nhập
 * scope=university → bảng tin riêng của trường, bắt buộc đã xác thực
 */
export const getFeed = async (req, res) => {
  const scope = req.query.scope === 'global' ? 'global' : 'university';
  const sort = req.query.sort === 'hot' ? 'hot' : 'new';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, parseInt(req.query.limit, 10) || 20);
  const { category, topic } = req.query;

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
  if (topic && mongoose.isValidObjectId(topic)) {
    filter.topic = new mongoose.Types.ObjectId(topic);
  }

  let posts;
  let total;

  if (sort === 'hot') {
    /**
     * Điểm nóng theo kiểu Hacker News: tương tác chia cho tuổi bài.
     *
     * Bình luận nặng hơn lượt thích (5 so với 3) vì bình luận tốn công
     * hơn nhiều — một bài có 3 bình luận thật sự sống động hơn bài có
     * 20 lượt thích. Lượt xem tính rất nhẹ, chỉ để phá thế hoà.
     *
     * Mẫu số (giờ + 2)^1.5 khiến bài cũ tụt dần, nên bảng tin không bị
     * một bài viral chiếm chỗ mãi mãi.
     */
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          _ageHours: {
            $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3600000],
          },
        },
      },
      {
        $addFields: {
          _hot: {
            $divide: [
              {
                $add: [
                  { $multiply: [{ $ifNull: ['$likeCount', 0] }, 3] },
                  { $multiply: [{ $ifNull: ['$commentCount', 0] }, 5] },
                  { $multiply: [{ $ifNull: ['$views', 0] }, 0.15] },
                  1,
                ],
              },
              { $pow: [{ $add: ['$_ageHours', 2] }, 1.5] },
            ],
          },
        },
      },
      { $sort: { isPinned: -1, _hot: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    [posts, total] = await Promise.all([
      Post.aggregate(pipeline),
      Post.countDocuments(filter),
    ]);

    await Post.populate(posts, [
      { path: 'university', select: 'shortName name' },
      { path: 'topic', select: 'title emoji color' },
    ]);
  } else {
    [posts, total] = await Promise.all([
      Post.find(filter)
        /**
         * Phải xin '+author' vì Post.author để select:false. Thiếu nó thì đoạn tra
         * tên tác giả bên dưới tìm theo mảng rỗng: mọi bài công khai hiện thành
         * "Người dùng đã xoá", isMine luôn sai nên nút xoá bài của chính mình
         * không hiện. Nhánh 'hot' không dính vì aggregate không đi qua projection.
         */
        .select('+author')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('university', 'shortName name')
        .populate('topic', 'title emoji color')
        .lean(),
      Post.countDocuments(filter),
    ]);
  }

  // Chỉ nạp tác giả cho bài công khai — bài ẩn danh không đi qua nhánh này
  const publicPosts = posts.filter((p) => !p.isAnonymous && !p.isOfficial);
  if (publicPosts.length) {
    const User = mongoose.model('User');
    const authors = await User.find({
      _id: { $in: publicPosts.map((p) => p.author).filter(Boolean) },
    })
      .select('nickname profilePhoto')
      .lean();
    const byId = new Map(authors.map((a) => [String(a._id), a]));
    publicPosts.forEach((p) => {
      p.author = byId.get(String(p.author)) || null;
    });
  }

  const ids = posts.map((p) => p._id);

  const [likedIds, savedIds] = await Promise.all([
    Post.find({ _id: { $in: ids }, likes: req.user._id }).select('_id').lean(),
    Bookmark.find({ user: req.user._id, post: { $in: ids } }).select('post').lean(),
  ]);

  const likedPostIds = new Set(likedIds.map((p) => String(p._id)));
  const savedPostIds = new Set(savedIds.map((b) => String(b.post)));

  res.status(200).json({
    status: 'success',
    data: {
      scope,
      sort,
      posts: serializePosts(posts, req.user._id, {
        likedPostIds,
        savedPostIds,
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
 * GET /api/community/topics
 * Chủ đề đang trong mùa. Hết hạn thì tự biến mất, không phải tắt tay.
 */
export const getTopics = async (req, res) => {
  const scope = req.query.scope === 'university' ? 'university' : 'global';

  if (scope === 'university' && req.user.verificationStatus !== 'verified') {
    return res.status(200).json({ status: 'success', data: { topics: [] } });
  }

  const uniId = req.user.university?._id || req.user.university || null;
  const topics = await Topic.findActive(scope, uniId);

  res.status(200).json({
    status: 'success',
    data: { topics: topics.map(serializeTopic) },
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
    const quota = await getQuota(req.user);

    if (quota.remaining <= 0) {
      return res.status(429).json({
        status: 'error',
        code: 'GUEST_POST_LIMIT',
        message: `Hôm nay bạn đã đăng đủ ${GUEST_POSTS_PER_DAY} bài. Xác thực email trường để bỏ giới hạn.`,
        quota,
      });
    }
  }

  const post = await Post.create({
    ...value,
    topic: value.topic || null,
    author: req.user._id,
    university: value.communityType === 'university' ? universityId : null,
    lastActivityAt: new Date(),
  });

  if (value.topic) {
    await Topic.updateOne({ _id: value.topic }, { $inc: { postCount: 1 } });
  }

  logger.info(`Bài mới: ${post._id} (${value.communityType}, ẩn danh: ${post.isAnonymous})`);

  const populated = await Post.findById(post._id)
    .populate('university', 'shortName name')
    .populate('topic', 'title emoji color');

  res.status(201).json({
    status: 'success',
    message: 'Đăng bài thành công',
    data: {
      post: serializePost(populated, req.user._id),
      quota: await getQuota(req.user),
    },
  });
};

/**
 * GET /api/community/quota
 *
 * Frontend gọi TRƯỚC khi mở màn soạn bài, để báo hết lượt ngay từ đầu
 * thay vì để người dùng gõ xong cả bài rồi mới chặn ở nút Đăng.
 */
export const getPostQuota = async (req, res) => {
  res.status(200).json({ status: 'success', data: await getQuota(req.user) });
};

/**
 * GET /api/community/posts/:id
 */
export const getPost = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false })
    .select('+author')
    .populate('university', 'shortName name')
    .populate('topic', 'title emoji color');

  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  const denied = postViewError(post, req.user);
  if (denied) {
    return res.status(denied.status).json({ status: 'error', ...denied });
  }

  /**
   * LỖI CŨ: tăng views SAU khi đã lấy document ra, nên phản hồi trả về
   * số cũ — người dùng thấy lượt xem luôn chậm một nhịp.
   *
   * Nay tăng và lấy lại giá trị mới trong cùng một thao tác.
   * Không đếm lượt xem của chính tác giả — bài của mình mở bao nhiêu lần
   * cũng không nên tự thổi số lên.
   */
  const isAuthor = String(post.author) === String(req.user._id);

  if (!isAuthor) {
    const bumped = await Post.findByIdAndUpdate(
      post._id,
      { $inc: { views: 1 } },
      { new: true, select: 'views' }
    );
    if (bumped) post.views = bumped.views;
  }

  if (!post.isAnonymous) {
    await post.populate({ path: 'author', select: 'nickname profilePhoto' });
  }

  const [liked, saved] = await Promise.all([
    Post.exists({ _id: post._id, likes: req.user._id }),
    Bookmark.exists({ user: req.user._id, post: post._id }),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      post: serializePost(post, req.user._id, {
        likedByMe: Boolean(liked),
        savedByMe: Boolean(saved),
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

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).select('+author');
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  const denied = postViewError(post, req.user);
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

  const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).select('+author');
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  // Không được để lọt: bình luận của bài trường cũng phải chặn như bài
  const denied = postViewError(post, req.user);
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

  const denied = postViewError(post, req.user);
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

  const post = await Post.findById(comment.post).select('+author');
  if (post) {
    const denied = postViewError(post, req.user);
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

/**
 * GET /api/community/posts/mine
 *
 * Bài của chính mình, kèm số liệu và trạng thái trên bảng Đang nổi.
 *
 * Màn này tồn tại chủ yếu vì một lý do: người đăng ẩn danh đã gỡ bài
 * khỏi bảng xếp hạng cần một chỗ để đổi ý. Không có nó thì quyết định
 * gỡ là một chiều, mà lời hứa "đổi ý lúc nào cũng được" thành lời suông.
 */
export const getMyPosts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;

  const [posts, total] = await Promise.all([
    Post.find({ author: req.user._id, isDeleted: false })
      .select(
        '+author title content category isAnonymous isOfficial communityType university ' +
          'viewCount likeCount commentCount createdAt excludedFromTrending'
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('university', 'shortName')
      .lean(),
    Post.countDocuments({ author: req.user._id, isDeleted: false }),
  ]);

  /**
   * Hạng hiện tại lấy từ bảng đã tính sẵn, không tính lại.
   *
   * Tính lại ở đây sẽ khiến mỗi lần mở màn này chạy toàn bộ thuật toán
   * xếp hạng — tốn vô ích, vì bảng vốn chỉ làm mới 20 phút một lần.
   */
  const caches = await TrendingCache.find({ window: '6h' }).select('scope ranking').lean();
  const rankOf = (postId) => {
    for (const c of caches) {
      const hit = c.ranking?.find((r) => String(r.post) === String(postId));
      if (hit) return hit.rank;
    }
    return null;
  };

  res.status(200).json({
    status: 'success',
    data: {
      posts: posts.map((p) => ({
        id: String(p._id),
        title: p.title,
        excerpt: (p.content || '').slice(0, 140),
        category: p.category,
        scope: p.communityType,
        university: p.university?.shortName || null,
        isAnonymous: Boolean(p.isAnonymous),
        isOfficial: Boolean(p.isOfficial),
        viewCount: p.viewCount || 0,
        likeCount: p.likeCount || 0,
        commentCount: p.commentCount || 0,
        excludedFromTrending: Boolean(p.excludedFromTrending),
        trendingRank: p.excludedFromTrending ? null : rankOf(p._id),
        createdAt: p.createdAt,
      })),
      pagination: { page, limit, total, hasMore: page * limit < total },
      counts: {
        total,
        anonymous: posts.filter((p) => p.isAnonymous).length,
        excluded: posts.filter((p) => p.excludedFromTrending).length,
      },
    },
  });
};
