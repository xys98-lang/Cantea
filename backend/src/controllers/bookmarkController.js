import Joi from 'joi';
import mongoose from 'mongoose';
import Bookmark from '../models/Bookmark.js';
import Collection from '../models/Collection.js';
import Post from '../models/Post.js';
import { serializePosts } from '../utils/serializers.js';
import { logger } from '../utils/logger.js';

const MAX_COLLECTIONS = 20;

const saveSchema = Joi.object({
  postId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Thiếu mã bài viết',
  }),
  collectionId: Joi.string().hex().length(24).allow(null, ''),
  note: Joi.string().trim().max(300).allow('').default(''),
});

const collectionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(40).required().messages({
    'any.required': 'Nhập tên bộ sưu tập',
  }),
  emoji: Joi.string().trim().max(8).allow('').default(''),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

const serializeCollection = (c) => ({
  id: String(c._id),
  name: c.name,
  emoji: c.emoji || '',
  isDefault: Boolean(c.isDefault),
  itemCount: c.itemCount || 0,
});

// ===== BỘ SƯU TẬP =====

/**
 * GET /api/bookmarks/collections
 */
export const getCollections = async (req, res) => {
  await Collection.ensureDefault(req.user._id);

  const list = await Collection.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: 1,
  });

  res.status(200).json({
    status: 'success',
    data: { collections: list.map(serializeCollection) },
  });
};

/**
 * POST /api/bookmarks/collections
 */
export const createCollection = async (req, res) => {
  const { error, value } = collectionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const count = await Collection.countDocuments({ user: req.user._id });
  if (count >= MAX_COLLECTIONS) {
    return res.status(400).json({
      status: 'error',
      code: 'TOO_MANY_COLLECTIONS',
      message: `Tối đa ${MAX_COLLECTIONS} bộ sưu tập`,
    });
  }

  try {
    const created = await Collection.create({
      user: req.user._id,
      name: value.name,
      emoji: value.emoji,
    });
    res.status(201).json({
      status: 'success',
      message: 'Đã tạo bộ sưu tập',
      data: { collection: serializeCollection(created) },
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({
        status: 'error',
        code: 'NAME_TAKEN',
        message: 'Bạn đã có bộ sưu tập tên này',
      });
    }
    throw e;
  }
};

/**
 * PUT /api/bookmarks/collections/:id
 */
export const updateCollection = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const { error, value } = collectionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const col = await Collection.findOne({ _id: req.params.id, user: req.user._id });
  if (!col) {
    return res.status(404).json({
      status: 'error',
      code: 'COLLECTION_NOT_FOUND',
      message: 'Không tìm thấy bộ sưu tập',
    });
  }

  col.name = value.name;
  col.emoji = value.emoji;
  await col.save();

  res.status(200).json({
    status: 'success',
    message: 'Đã đổi tên',
    data: { collection: serializeCollection(col) },
  });
};

/**
 * DELETE /api/bookmarks/collections/:id
 * Bài trong bộ bị xoá sẽ dồn về bộ mặc định, không mất đi.
 */
export const deleteCollection = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const col = await Collection.findOne({ _id: req.params.id, user: req.user._id });
  if (!col) {
    return res.status(404).json({
      status: 'error',
      code: 'COLLECTION_NOT_FOUND',
      message: 'Không tìm thấy bộ sưu tập',
    });
  }

  if (col.isDefault) {
    return res.status(400).json({
      status: 'error',
      code: 'CANNOT_DELETE_DEFAULT',
      message: 'Không xoá được bộ mặc định',
    });
  }

  const fallback = await Collection.ensureDefault(req.user._id);
  const moved = await Bookmark.updateMany(
    { user: req.user._id, folder: col._id },
    { $set: { folder: fallback._id } }
  );

  await Collection.updateOne(
    { _id: fallback._id },
    { $inc: { itemCount: moved.modifiedCount || 0 } }
  );
  await col.deleteOne();

  res.status(200).json({
    status: 'success',
    message: moved.modifiedCount
      ? `Đã xoá bộ sưu tập, ${moved.modifiedCount} bài chuyển về "${fallback.name}"`
      : 'Đã xoá bộ sưu tập',
  });
};

// ===== LƯU BÀI =====

/**
 * POST /api/bookmarks
 * Lưu bài, hoặc chuyển bài sang bộ sưu tập khác nếu đã lưu rồi.
 */
export const savePost = async (req, res) => {
  const { error, value } = saveSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const post = await Post.findOne({ _id: value.postId, isDeleted: false });
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  let target;
  if (value.collectionId) {
    target = await Collection.findOne({ _id: value.collectionId, user: req.user._id });
    if (!target) {
      return res.status(404).json({
        status: 'error',
        code: 'COLLECTION_NOT_FOUND',
        message: 'Không tìm thấy bộ sưu tập',
      });
    }
  } else {
    target = await Collection.ensureDefault(req.user._id);
  }

  const existing = await Bookmark.findOne({ user: req.user._id, post: post._id });

  if (existing) {
    // Đã lưu rồi — chuyển sang bộ khác thay vì tạo bản trùng
    if (String(existing.folder) !== String(target._id)) {
      await Collection.updateOne({ _id: existing.folder }, { $inc: { itemCount: -1 } });
      await Collection.updateOne({ _id: target._id }, { $inc: { itemCount: 1 } });
      existing.folder = target._id;
    }
    if (value.note !== undefined) existing.note = value.note;
    await existing.save();

    return res.status(200).json({
      status: 'success',
      message: `Đã chuyển vào "${target.name}"`,
      data: { saved: true, collection: serializeCollection(target) },
    });
  }

  await Bookmark.create({
    user: req.user._id,
    post: post._id,
    folder: target._id,
    note: value.note,
  });
  await Collection.updateOne({ _id: target._id }, { $inc: { itemCount: 1 } });

  res.status(201).json({
    status: 'success',
    message: `Đã lưu vào "${target.name}"`,
    data: { saved: true, collection: serializeCollection(target) },
  });
};

/**
 * DELETE /api/bookmarks/:postId
 */
export const unsavePost = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) return badId(res);

  const removed = await Bookmark.findOneAndDelete({
    user: req.user._id,
    post: req.params.postId,
  });

  if (!removed) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_SAVED',
      message: 'Bài này chưa được lưu',
    });
  }

  await Collection.updateOne({ _id: removed.folder }, { $inc: { itemCount: -1 } });

  res.status(200).json({ status: 'success', message: 'Đã bỏ lưu', data: { saved: false } });
};

/**
 * GET /api/bookmarks?collection=<id>
 */
export const getSaved = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, parseInt(req.query.limit, 10) || 20);

  const filter = { user: req.user._id };
  if (req.query.collection && mongoose.isValidObjectId(req.query.collection)) {
    filter.folder = new mongoose.Types.ObjectId(req.query.collection);
  }

  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'post',
        /**
         * Phải xin '+author' vì Post.author để select:false. Không xin thì trường này
         * vắng mặt, đoạn tra tên người đăng bên dưới tìm theo mảng rỗng, và mọi bài
         * công khai hiện ra là "Người dùng đã xoá". Nó cũng làm isMine sai, kéo theo
         * canDelete sai — bài của chính mình lưu lại thì không xoá được.
         *
         * Dấu '+' giữ nguyên các trường mặc định, chỉ thêm author vào. Id thô đi tới
         * serializePost là an toàn: đó chính là chỗ quyết định ẩn hay hiện.
         */
        select: '+author',
        populate: [
          { path: 'university', select: 'shortName name' },
          { path: 'topic', select: 'title emoji color' },
        ],
      })
      .lean(),
    Bookmark.countDocuments(filter),
  ]);

  // Bài đã bị xoá thì bỏ qua, không hiện ô trống
  const alive = bookmarks.filter((b) => b.post && !b.post.isDeleted);

  const posts = alive.map((b) => ({ ...b.post, _savedNote: b.note, _savedAt: b.createdAt }));

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

  const serialized = serializePosts(posts, req.user._id).map((p, i) => ({
    ...p,
    savedByMe: true,
    savedNote: posts[i]._savedNote || '',
    savedAt: posts[i]._savedAt,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      posts: serialized,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    },
  });
};
