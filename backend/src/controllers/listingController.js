import Joi from 'joi';
import mongoose from 'mongoose';
import Listing from '../models/Listing.js';
import SavedListing from '../models/SavedListing.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { logger } from '../utils/logger.js';

const MAX_LIMIT = 30;
const SOLD_LINGER_DAYS = 7;
const LISTING_TTL_DAYS = 30;

// ===== VALIDATION =====

const listingInput = Joi.object({
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.min': 'Tiêu đề quá ngắn',
    'any.required': 'Nhập tiêu đề tin đăng',
  }),
  description: Joi.string().trim().max(2000).allow('').default(''),
  images: Joi.array().items(Joi.string().uri()).max(5).default([]),
  category: Joi.string().valid('textbook', 'notes', 'supplies', 'other').default('textbook'),
  courseCode: Joi.string().trim().uppercase().max(20).allow('').default(''),
  dealType: Joi.string().valid('sell', 'give', 'exchange').default('sell'),
  price: Joi.number().min(0).max(100000000).default(0),
  originalPrice: Joi.number().min(0).max(100000000).allow(null).default(null),
  condition: Joi.string().valid('new', 'like_new', 'good', 'fair').default('good'),
});

const statusInput = Joi.object({
  status: Joi.string().valid('active', 'reserved', 'sold', 'hidden').required(),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

/**
 * Đăng tin và nhắn tin chỉ mở cho người đã xác thực.
 *
 * Không phải rào cản tuỳ tiện: giao dịch ở đây kết thúc bằng việc hai
 * người lạ hẹn gặp nhau trao đồ và tiền. Biết chắc cả hai là sinh viên
 * cùng trường là mức an toàn tối thiểu — và cũng là động cơ xác thực
 * mạnh nhất trong app, vì thứ thúc đẩy là một món đồ cụ thể.
 */
const verifiedOnly = (user) => {
  if (user.verificationStatus !== 'verified') {
    return {
      status: 403,
      code: 'UNIVERSITY_VERIFICATION_REQUIRED',
      message: 'Bạn cần xác thực email trường để đăng tin và giao dịch',
      currentStatus: user.verificationStatus,
    };
  }
  return null;
};

/**
 * Tin nào còn được hiện trên lưới.
 * Tin đã bán nán lại 7 ngày rồi mới ẩn — người mua hụt thấy được mặt
 * bằng giá, người bán mới biết nên ra giá bao nhiêu.
 */
const visibilityFilter = () => ({
  isDeleted: false,
  $or: [
    { status: { $in: ['active', 'reserved'] }, expiresAt: { $gt: new Date() } },
    {
      status: 'sold',
      soldAt: { $gt: new Date(Date.now() - SOLD_LINGER_DAYS * 24 * 3600 * 1000) },
    },
  ],
});

/** Ràng buộc giá theo loại giao dịch — cho không mà ghi giá là vô lý */
const normalizePrice = (value) => {
  if (value.dealType === 'give' || value.dealType === 'exchange') {
    return { ...value, price: 0 };
  }
  return value;
};

/**
 * Người bán LUÔN công khai. Đây là ngoại lệ duy nhất của quy tắc ẩn danh
 * trong toàn app, và nó phải rõ ràng: người mua cần đủ tín hiệu để dám
 * hẹn gặp, người bán cần biết mình đang lộ những gì.
 */
const sellerOf = (u) =>
  u && typeof u === 'object'
    ? {
        id: String(u._id),
        displayName: u.nickname || 'Người dùng',
        avatar: u.profilePhoto || null,
        major: u.major || '',
        year: u.year || null,
        exchangesCompleted: u.exchangesCompleted || 0,
        isVerified: u.verificationStatus === 'verified',
      }
    : null;

const discountOf = (p) => {
  if (!p.originalPrice || !p.price || p.price >= p.originalPrice) return null;
  return Math.round((1 - p.price / p.originalPrice) * 100);
};

const serializeListing = (doc, viewerId, opts = {}) => {
  const l = doc.toObject ? doc.toObject() : doc;
  const sellerId = String(l.seller?._id || l.seller || '');

  return {
    id: String(l._id),
    title: l.title,
    description: l.description,
    images: l.images || [],
    cover: l.images?.[0] || null,

    category: l.category,
    courseCode: l.courseCode || '',
    condition: l.condition,

    dealType: l.dealType,
    price: l.price,
    originalPrice: l.originalPrice,
    discountPercent: discountOf(l),

    status: l.status,
    soldAt: l.soldAt,
    expiresAt: l.expiresAt,
    /** Số ngày còn lại — để nhắc người bán đẩy tin trước khi hết hạn */
    daysLeft: Math.max(
      0,
      Math.ceil((new Date(l.expiresAt) - Date.now()) / (24 * 3600 * 1000))
    ),

    seller: sellerOf(l.seller),
    university:
      l.university && l.university.shortName
        ? { id: String(l.university._id), shortName: l.university.shortName }
        : String(l.university),

    viewCount: l.viewCount || 0,
    saveCount: l.saveCount || 0,
    messageCount: l.messageCount || 0,

    savedByMe: Boolean(opts.savedByMe),
    isMine: sellerId === String(viewerId),
    createdAt: l.createdAt,
    bumpedAt: l.bumpedAt,
  };
};

// ===== HANDLERS =====

/**
 * GET /api/listings
 *
 * Người đã xác thực xem tin của trường mình. Người chưa xác thực xem
 * tin của mọi trường — không có gì để xem thì không có lý do quay lại,
 * mà thấy được món đồ cụ thể mình muốn mới là động cơ đi xác thực.
 */
export const getListings = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, parseInt(req.query.limit, 10) || 20);

  const verified = req.user.verificationStatus === 'verified';
  const myUni = req.user.university?._id || req.user.university || null;

  const filter = { ...visibilityFilter() };

  const scope = req.query.scope === 'all' ? 'all' : 'university';
  if (verified && myUni && scope === 'university') {
    filter.university = myUni;
  }

  if (req.query.category) filter.category = req.query.category;
  if (req.query.dealType) filter.dealType = req.query.dealType;
  if (req.query.courseCode) filter.courseCode = String(req.query.courseCode).toUpperCase();

  const q = String(req.query.q || '').trim();
  let sortSpec = { bumpedAt: -1 };
  let projection = null;

  if (q) {
    filter.$text = { $search: q };
    projection = { score: { $meta: 'textScore' } };
    sortSpec = { score: { $meta: 'textScore' }, bumpedAt: -1 };
  } else if (req.query.sort === 'price_asc') {
    sortSpec = { price: 1, bumpedAt: -1 };
  } else if (req.query.sort === 'price_desc') {
    sortSpec = { price: -1, bumpedAt: -1 };
  }

  const [listings, total] = await Promise.all([
    Listing.find(filter, projection)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seller', 'nickname profilePhoto major year exchangesCompleted verificationStatus')
      .populate('university', 'shortName')
      .lean(),
    Listing.countDocuments(filter),
  ]);

  const savedIds = await SavedListing.find({
    user: req.user._id,
    listing: { $in: listings.map((l) => l._id) },
  })
    .select('listing')
    .lean();
  const savedSet = new Set(savedIds.map((s) => String(s.listing)));

  res.status(200).json({
    status: 'success',
    data: {
      scope: verified && scope === 'university' ? 'university' : 'all',
      canPost: verified,
      listings: listings.map((l) =>
        serializeListing(l, req.user._id, { savedByMe: savedSet.has(String(l._id)) })
      ),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    },
  });
};

/**
 * GET /api/listings/mine
 */
export const getMyListings = async (req, res) => {
  const listings = await Listing.find({ seller: req.user._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('seller', 'nickname profilePhoto major year exchangesCompleted verificationStatus')
    .populate('university', 'shortName')
    .lean();

  res.status(200).json({
    status: 'success',
    data: {
      listings: listings.map((l) => serializeListing(l, req.user._id)),
      counts: {
        active: listings.filter((l) => l.status === 'active').length,
        sold: listings.filter((l) => l.status === 'sold').length,
      },
    },
  });
};

/**
 * GET /api/listings/saved
 */
export const getSavedListings = async (req, res) => {
  const saved = await SavedListing.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({
      path: 'listing',
      populate: [
        { path: 'seller', select: 'nickname profilePhoto major year exchangesCompleted verificationStatus' },
        { path: 'university', select: 'shortName' },
      ],
    })
    .lean();

  const alive = saved.filter((s) => s.listing && !s.listing.isDeleted);

  res.status(200).json({
    status: 'success',
    data: {
      listings: alive.map((s) => serializeListing(s.listing, req.user._id, { savedByMe: true })),
    },
  });
};

/**
 * POST /api/listings
 */
export const createListing = async (req, res) => {
  const denied = verifiedOnly(req.user);
  if (denied) return res.status(denied.status).json({ status: 'error', ...denied });

  const { error, value } = listingInput.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details.map((d) => d.message),
    });
  }

  const clean = normalizePrice(value);

  if (clean.dealType === 'sell' && clean.price <= 0) {
    return res.status(400).json({
      status: 'error',
      code: 'PRICE_REQUIRED',
      message: 'Nhập giá bán, hoặc chuyển sang hình thức Tặng',
    });
  }

  /**
   * Không ảnh thì không ai mua sách cũ. Bắt buộc ít nhất một ảnh giữ cho
   * lưới không đầy ô xám — chất lượng ảnh chính là chất lượng cả cái lưới.
   */
  if (!clean.images.length) {
    return res.status(400).json({
      status: 'error',
      code: 'IMAGE_REQUIRED',
      message: 'Thêm ít nhất một ảnh. Tin không ảnh gần như không ai bấm vào.',
    });
  }

  const listing = await Listing.create({
    ...clean,
    seller: req.user._id,
    university: req.user.university?._id || req.user.university,
  });

  logger.info(`Tin đăng mới: ${listing._id} (${clean.dealType})`);

  const full = await Listing.findById(listing._id)
    .populate('seller', 'nickname profilePhoto major year exchangesCompleted verificationStatus')
    .populate('university', 'shortName');

  res.status(201).json({
    status: 'success',
    message: 'Đã đăng tin',
    data: { listing: serializeListing(full, req.user._id) },
  });
};

/**
 * GET /api/listings/:id
 */
export const getListing = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false })
    .populate('seller', 'nickname profilePhoto major year exchangesCompleted verificationStatus')
    .populate('university', 'shortName');

  if (!listing) {
    return res.status(404).json({
      status: 'error',
      code: 'LISTING_NOT_FOUND',
      message: 'Tin đăng không tồn tại',
    });
  }

  // Không đếm lượt xem của chính người bán
  const isMine = String(listing.seller?._id) === String(req.user._id);
  if (!isMine) {
    const bumped = await Listing.findByIdAndUpdate(
      listing._id,
      { $inc: { viewCount: 1 } },
      { new: true, select: 'viewCount' }
    );
    if (bumped) listing.viewCount = bumped.viewCount;
  }

  const [saved, myConvo] = await Promise.all([
    SavedListing.exists({ user: req.user._id, listing: listing._id }),
    isMine ? null : Conversation.findOne({ listing: listing._id, buyer: req.user._id }).select('_id'),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      listing: serializeListing(listing, req.user._id, { savedByMe: Boolean(saved) }),
      // Đã nhắn rồi thì nút đổi thành "Mở hội thoại" thay vì mở luồng mới
      conversationId: myConvo ? String(myConvo._id) : null,
      canMessage: !isMine && req.user.verificationStatus === 'verified',
    },
  });
};

/**
 * PUT /api/listings/:id
 */
export const updateListing = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const { error, value } = listingInput.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const listing = await Listing.findOne({
    _id: req.params.id,
    seller: req.user._id,
    isDeleted: false,
  });

  if (!listing) {
    return res.status(404).json({
      status: 'error',
      code: 'LISTING_NOT_FOUND',
      message: 'Không tìm thấy tin đăng của bạn',
    });
  }

  const clean = normalizePrice(value);
  if (!clean.images.length) {
    return res.status(400).json({
      status: 'error',
      code: 'IMAGE_REQUIRED',
      message: 'Tin đăng cần ít nhất một ảnh',
    });
  }

  Object.assign(listing, clean);
  await listing.save();

  const full = await Listing.findById(listing._id)
    .populate('seller', 'nickname profilePhoto major year exchangesCompleted verificationStatus')
    .populate('university', 'shortName');

  res.status(200).json({
    status: 'success',
    message: 'Đã cập nhật tin',
    data: { listing: serializeListing(full, req.user._id) },
  });
};

/**
 * PATCH /api/listings/:id/status
 *
 * Đánh dấu đã bán sẽ tự báo cho mọi người đang hỏi mua, để họ không
 * phải nhắn thêm lần nữa rồi mới biết là hết.
 */
export const setStatus = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const { error, value } = statusInput.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Trạng thái không hợp lệ',
    });
  }

  const listing = await Listing.findOne({
    _id: req.params.id,
    seller: req.user._id,
    isDeleted: false,
  });

  if (!listing) {
    return res.status(404).json({
      status: 'error',
      code: 'LISTING_NOT_FOUND',
      message: 'Không tìm thấy tin đăng của bạn',
    });
  }

  const wasSold = listing.status === 'sold';
  listing.status = value.status;
  listing.soldAt = value.status === 'sold' ? new Date() : null;
  await listing.save();

  if (value.status === 'sold' && !wasSold) {
    const convos = await Conversation.find({ listing: listing._id }).select('_id buyer');

    await Promise.all(
      convos.map(async (c) => {
        await Message.create({
          conversation: c._id,
          sender: req.user._id,
          kind: 'system',
          text: 'Người bán đã đánh dấu tin này là đã bán.',
        });
        await Conversation.updateOne(
          { _id: c._id },
          {
            $set: {
              lastMessage: {
                text: 'Người bán đã đánh dấu tin này là đã bán.',
                sender: req.user._id,
                at: new Date(),
              },
            },
            $inc: { unreadBuyer: 1 },
          }
        );
      })
    );

    if (convos.length) {
      logger.info(`Báo đã bán tới ${convos.length} người hỏi mua`);
    }
  }

  res.status(200).json({
    status: 'success',
    message:
      value.status === 'sold'
        ? 'Đã đánh dấu đã bán. Những người đang hỏi mua đã được báo.'
        : 'Đã cập nhật trạng thái tin',
    data: { status: listing.status },
  });
};

/**
 * POST /api/listings/:id/bump — gia hạn thêm 30 ngày
 */
export const bumpListing = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const listing = await Listing.findOne({
    _id: req.params.id,
    seller: req.user._id,
    isDeleted: false,
  });

  if (!listing) {
    return res.status(404).json({
      status: 'error',
      code: 'LISTING_NOT_FOUND',
      message: 'Không tìm thấy tin đăng của bạn',
    });
  }

  // Chặn đẩy tin liên tục để chiếm đầu lưới
  const since = Date.now() - new Date(listing.bumpedAt).getTime();
  if (since < 24 * 3600 * 1000) {
    const hours = Math.ceil((24 * 3600 * 1000 - since) / 3600000);
    return res.status(429).json({
      status: 'error',
      code: 'BUMP_TOO_SOON',
      message: `Mỗi tin chỉ đẩy được một lần mỗi ngày. Thử lại sau ${hours} giờ.`,
    });
  }

  listing.bumpedAt = new Date();
  listing.expiresAt = new Date(Date.now() + LISTING_TTL_DAYS * 24 * 3600 * 1000);
  if (listing.status === 'hidden') listing.status = 'active';
  await listing.save();

  res.status(200).json({
    status: 'success',
    message: `Đã đẩy tin lên đầu, gia hạn thêm ${LISTING_TTL_DAYS} ngày`,
    data: { bumpedAt: listing.bumpedAt, expiresAt: listing.expiresAt },
  });
};

/**
 * DELETE /api/listings/:id — xoá mềm, giữ lại để truy vết khi có báo cáo
 */
export const deleteListing = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const listing = await Listing.findOne({ _id: req.params.id, seller: req.user._id });
  if (!listing || listing.isDeleted) {
    return res.status(404).json({
      status: 'error',
      code: 'LISTING_NOT_FOUND',
      message: 'Không tìm thấy tin đăng của bạn',
    });
  }

  listing.isDeleted = true;
  listing.deletedAt = new Date();
  await listing.save();

  res.status(200).json({ status: 'success', message: 'Đã xoá tin đăng' });
};

/**
 * POST /api/listings/:id/save
 */
export const toggleSave = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const listing = await Listing.findOne({ _id: req.params.id, isDeleted: false }).select('_id');
  if (!listing) {
    return res.status(404).json({
      status: 'error',
      code: 'LISTING_NOT_FOUND',
      message: 'Tin đăng không tồn tại',
    });
  }

  const existing = await SavedListing.findOneAndDelete({
    user: req.user._id,
    listing: listing._id,
  });

  if (existing) {
    await Listing.updateOne({ _id: listing._id }, { $inc: { saveCount: -1 } });
    return res.status(200).json({ status: 'success', data: { saved: false } });
  }

  await SavedListing.create({ user: req.user._id, listing: listing._id });
  await Listing.updateOne({ _id: listing._id }, { $inc: { saveCount: 1 } });

  res.status(201).json({ status: 'success', data: { saved: true } });
};
