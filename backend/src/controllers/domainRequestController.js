import Joi from 'joi';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import DomainRequest from '../models/DomainRequest.js';
import University from '../models/University.js';
import { logger } from '../utils/logger.js';

const MAX_PENDING = 2;

const submitSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Nhập email trường của bạn',
  }),
  universityName: Joi.string().trim().min(3).max(160).required().messages({
    'any.required': 'Nhập tên trường của bạn',
  }),
  note: Joi.string().trim().max(500).allow('').default(''),
  evidence: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        publicId: Joi.string().required(),
      })
    )
    .max(3)
    .default([]),
});

const err = (res, status, code, message) =>
  res.status(status).json({ status: 'error', code, message });

/**
 * Xoá ảnh chứng minh khỏi Cloudinary.
 *
 * Gọi ngay khi yêu cầu được xử lý xong. Ảnh thẻ sinh viên nằm lại trên
 * máy chủ sau khi đã hết việc là rủi ro thuần tuý — không dùng vào gì,
 * mà lộ ra thì hỏng thật.
 */
const cleanupEvidence = async (requestId) => {
  const doc = await DomainRequest.findById(requestId).select('+evidence');
  if (!doc?.evidence?.length) return;

  await Promise.all(
    doc.evidence.map((e) =>
      e.publicId ? cloudinary.uploader.destroy(e.publicId).catch(() => {}) : null
    )
  );

  await DomainRequest.updateOne(
    { _id: requestId },
    { $set: { evidence: [], evidenceDeletedAt: new Date() } }
  );
};

/**
 * POST /api/domain-requests
 * Sinh viên gửi yêu cầu khi đuôi email không được nhận diện.
 */
export const submitRequest = async (req, res) => {
  const { error, value } = submitSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return err(res, 400, 'VALIDATION_ERROR', error.details[0].message);
  }

  const domain = value.email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return err(res, 400, 'INVALID_EMAIL', 'Email không hợp lệ');

  // Đuôi đã được hỗ trợ — có thể họ gõ sai chỗ khác
  const existing = await University.findOne({ emailDomains: domain, isActive: true });
  if (existing) {
    return err(
      res,
      409,
      'DOMAIN_ALREADY_SUPPORTED',
      `Đuôi @${domain} đã được hỗ trợ cho ${existing.shortName}. Thử xác thực lại.`
    );
  }

  const pending = await DomainRequest.countDocuments({
    requester: req.user._id,
    status: 'pending',
  });
  if (pending >= MAX_PENDING) {
    return err(
      res,
      429,
      'TOO_MANY_PENDING',
      'Bạn đang có yêu cầu chờ xử lý. Đợi kết quả rồi gửi tiếp.'
    );
  }

  try {
    const doc = await DomainRequest.create({
      requester: req.user._id,
      domain,
      universityName: value.universityName,
      note: value.note,
      evidence: value.evidence,
    });

    logger.info(`Yêu cầu bổ sung đuôi: @${domain} — ${value.universityName}`);

    res.status(201).json({
      status: 'success',
      message:
        'Đã gửi yêu cầu. Chúng tôi kiểm tra trong 1–2 ngày và báo lại ngay trong app.',
      data: { id: String(doc._id), domain, status: 'pending' },
    });
  } catch (e) {
    if (e.code === 11000) {
      return err(res, 409, 'ALREADY_REQUESTED', 'Bạn đã gửi yêu cầu cho đuôi email này rồi.');
    }
    throw e;
  }
};

/**
 * GET /api/domain-requests/mine
 * App gọi khi mở màn xác thực, để hiện trạng thái yêu cầu đang chờ.
 */
export const getMyRequests = async (req, res) => {
  const list = await DomainRequest.find({ requester: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('resolvedUniversity', 'shortName name')
    .lean();

  res.status(200).json({
    status: 'success',
    data: {
      requests: list.map((r) => ({
        id: String(r._id),
        domain: r.domain,
        universityName: r.universityName,
        status: r.status,
        resolution: r.resolution || '',
        university: r.resolvedUniversity
          ? { shortName: r.resolvedUniversity.shortName, name: r.resolvedUniversity.name }
          : null,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
    },
  });
};

// ═══════════ QUẢN TRỊ ═══════════

/**
 * GET /api/domain-requests
 * Danh sách yêu cầu cho quản trị viên xem xét.
 */
export const listRequests = async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
    ? req.query.status
    : 'pending';

  const list = await DomainRequest.find({ status })
    .sort({ createdAt: 1 })
    .limit(100)
    .select('+evidence')
    .populate('requester', 'nickname email')
    .lean();

  /** Gom theo đuôi: năm người cùng báo một đuôi thì gần như chắc chắn đúng */
  const byDomain = {};
  list.forEach((r) => {
    (byDomain[r.domain] ||= []).push(r);
  });

  res.status(200).json({
    status: 'success',
    data: {
      total: list.length,
      domains: Object.entries(byDomain)
        .map(([domain, items]) => ({
          domain,
          count: items.length,
          universityName: items[0].universityName,
          requests: items.map((r) => ({
            id: String(r._id),
            requester: r.requester?.nickname || '—',
            note: r.note,
            evidence: (r.evidence || []).map((e) => e.url),
            createdAt: r.createdAt,
          })),
        }))
        .sort((a, b) => b.count - a.count),
    },
  });
};

/**
 * POST /api/domain-requests/:id/approve
 *
 * Gán đuôi email vào một trường đã có. Trường hoàn toàn mới thì thêm vào
 * seedData.js rồi chạy lại — hiếm hơn nhiều, và làm bằng tay thì kiểm
 * soát được tên, mã viết tắt, thành phố cho đúng.
 *
 * KHÔNG bao giờ tự động duyệt. Đuôi email quyết định ai vào được cộng
 * đồng nào — một đuôi sai mở cửa cho người ngoài trường.
 */
export const approveRequest = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return err(res, 400, 'INVALID_ID', 'ID không hợp lệ');
  }

  const slug = String(req.body.universitySlug || '').trim().toLowerCase();
  if (!slug) return err(res, 400, 'VALIDATION_ERROR', 'Chọn trường để gán đuôi này vào');

  const [request, uni] = await Promise.all([
    DomainRequest.findById(req.params.id),
    University.findOne({ slug }),
  ]);

  if (!request) return err(res, 404, 'NOT_FOUND', 'Yêu cầu không tồn tại');
  if (request.status !== 'pending') {
    return err(res, 409, 'ALREADY_RESOLVED', 'Yêu cầu này đã được xử lý');
  }
  if (!uni) return err(res, 404, 'UNIVERSITY_NOT_FOUND', `Không có trường với slug "${slug}"`);

  // Đuôi không được thuộc hai trường — sinh viên sẽ bị gán nhầm cộng đồng
  const clash = await University.findOne({
    emailDomains: request.domain,
    _id: { $ne: uni._id },
  });
  if (clash) {
    return err(
      res,
      409,
      'DOMAIN_CLASH',
      `Đuôi @${request.domain} đang thuộc ${clash.shortName}. Gỡ khỏi đó trước.`
    );
  }

  await University.updateOne({ _id: uni._id }, { $addToSet: { emailDomains: request.domain } });

  /** Duyệt một yêu cầu là duyệt luôn mọi yêu cầu cùng đuôi đang chờ */
  const siblings = await DomainRequest.find({ domain: request.domain, status: 'pending' }).select(
    '_id'
  );

  await DomainRequest.updateMany(
    { domain: request.domain, status: 'pending' },
    {
      $set: {
        status: 'approved',
        resolvedUniversity: uni._id,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        resolution: `Đã thêm @${request.domain} vào ${uni.shortName}`,
      },
    }
  );

  await Promise.all(siblings.map((s) => cleanupEvidence(s._id)));

  logger.info(`Duyệt đuôi @${request.domain} → ${uni.shortName} (${siblings.length} yêu cầu)`);

  res.status(200).json({
    status: 'success',
    message: `Đã thêm @${request.domain} vào ${uni.shortName}, xử lý ${siblings.length} yêu cầu`,
    data: { domain: request.domain, university: uni.shortName, resolved: siblings.length },
  });
};

/**
 * POST /api/domain-requests/:id/reject
 */
export const rejectRequest = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return err(res, 400, 'INVALID_ID', 'ID không hợp lệ');
  }

  const reason = String(req.body.reason || '').trim().slice(0, 300);
  if (!reason) {
    return err(res, 400, 'VALIDATION_ERROR', 'Cho biết lý do để người gửi hiểu');
  }

  const request = await DomainRequest.findById(req.params.id);
  if (!request) return err(res, 404, 'NOT_FOUND', 'Yêu cầu không tồn tại');
  if (request.status !== 'pending') {
    return err(res, 409, 'ALREADY_RESOLVED', 'Yêu cầu này đã được xử lý');
  }

  request.status = 'rejected';
  request.resolution = reason;
  request.resolvedBy = req.user._id;
  request.resolvedAt = new Date();
  await request.save();

  await cleanupEvidence(request._id);

  res.status(200).json({ status: 'success', message: 'Đã từ chối và xoá ảnh chứng minh' });
};
