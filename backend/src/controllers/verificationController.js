import Joi from 'joi';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import University from '../models/University.js';
import { deliverCode, universityCodeEmail } from '../services/email.js';
import { logger } from '../utils/logger.js';

// ===== CẤU HÌNH =====
const CODE_TTL_MINUTES = 15; // mã sống 15 phút
const MAX_ATTEMPTS = 5; // tối đa 5 lần nhập sai
const MAX_SENDS_PER_WINDOW = 3; // tối đa 3 lần gửi mã
const SEND_WINDOW_MINUTES = 60; // trong mỗi 60 phút
const RESEND_COOLDOWN_SECONDS = 60; // cách nhau ít nhất 60 giây

const requestSchema = Joi.object({
  universityEmail: Joi.string().email().required().messages({
    'string.email': 'Email trường không hợp lệ',
    'any.required': 'Vui lòng nhập email trường',
  }),
});

const confirmSchema = Joi.object({
  code: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'Mã xác thực gồm 6 chữ số',
      'string.pattern.base': 'Mã xác thực chỉ gồm chữ số',
      'any.required': 'Vui lòng nhập mã xác thực',
    }),
});

/** Sinh mã 6 chữ số bằng nguồn ngẫu nhiên an toàn */
const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * POST /api/auth/university/request
 * Nhận email trường, tự nhận diện trường từ đuôi mail, gửi mã 6 số.
 */
export const requestVerification = async (req, res) => {
  const { error, value } = requestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const universityEmail = value.universityEmail.toLowerCase().trim();
  const user = req.user;

  if (user.verificationStatus === 'verified') {
    return res.status(409).json({
      status: 'error',
      code: 'ALREADY_VERIFIED',
      message: 'Tài khoản của bạn đã được xác thực',
    });
  }

  // Tự suy ra trường từ đuôi mail — người dùng không được tự chọn
  const university = await University.findByEmail(universityEmail);
  if (!university) {
    return res.status(400).json({
      status: 'error',
      code: 'UNKNOWN_UNIVERSITY_DOMAIN',
      message: 'Email này chưa thuộc trường nào Cantea hỗ trợ. Hãy kiểm tra lại đuôi mail.',
    });
  }

  // Một email trường chỉ gắn được cho một tài khoản
  const taken = await User.findOne({
    universityEmail,
    _id: { $ne: user._id },
  });
  if (taken) {
    return res.status(409).json({
      status: 'error',
      code: 'UNIVERSITY_EMAIL_TAKEN',
      message: 'Email trường này đã được dùng cho tài khoản khác',
    });
  }

  const now = new Date();
  const v = user.verification || {};

  // Chống spam: khoảng cách tối thiểu giữa hai lần gửi
  if (v.lastSentAt && now - new Date(v.lastSentAt) < RESEND_COOLDOWN_SECONDS * 1000) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (now - new Date(v.lastSentAt))) / 1000
    );
    return res.status(429).json({
      status: 'error',
      code: 'RESEND_TOO_SOON',
      message: `Vui lòng đợi ${wait} giây trước khi gửi lại`,
      retryAfterSeconds: wait,
    });
  }

  // Chống spam: giới hạn số lần gửi trong một khung thời gian
  const windowStart = v.windowStartedAt ? new Date(v.windowStartedAt) : null;
  const windowExpired =
    !windowStart || now - windowStart > SEND_WINDOW_MINUTES * 60 * 1000;

  if (!windowExpired && v.sendCount >= MAX_SENDS_PER_WINDOW) {
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_REQUESTS',
      message: `Bạn đã gửi mã quá ${MAX_SENDS_PER_WINDOW} lần. Vui lòng thử lại sau 1 giờ.`,
    });
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  user.verification = {
    codeHash,
    pendingEmail: universityEmail,
    expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
    attempts: 0,
    lastSentAt: now,
    sendCount: windowExpired ? 1 : (v.sendCount || 0) + 1,
    windowStartedAt: windowExpired ? now : windowStart,
  };
  user.verificationStatus = 'pending';
  await user.save({ validateBeforeSave: false });

  const mail = await deliverCode(universityEmail, universityCodeEmail(code, university.name));

  /**
   * Gửi hỏng thì phải nói thẳng.
   *
   * Báo "đã gửi" trong khi email không tới nơi khiến người dùng ngồi
   * chờ, bấm gửi lại, rồi đợi hết 60 giây mỗi lần — mà mã sẽ không bao
   * giờ đến. Thà báo lỗi để họ thử lại hoặc liên hệ.
   *
   * Số lần gửi đã tăng ở trên nên phải hoàn lại, nếu không một lỗi phía
   * nhà cung cấp lại ăn mất lượt gửi của người dùng.
   */
  if (!mail.ok) {
    user.verification.sendCount = Math.max(0, (user.verification.sendCount || 1) - 1);
    user.verification.lastSentAt = null;
    await user.save({ validateBeforeSave: false });

    return res.status(502).json({
      status: 'error',
      code: 'EMAIL_SEND_FAILED',
      message: 'Không gửi được mã tới email trường. Thử lại sau ít phút.',
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Đã gửi mã xác thực tới ${universityEmail}`,
    data: {
      university: {
        id: university._id,
        name: university.name,
        shortName: university.shortName,
      },
      expiresInMinutes: CODE_TTL_MINUTES,
      /**
       * Chỉ trả mã khi CHƯA cấu hình dịch vụ email — lúc đó email không
       * đi đâu cả nên app phải hiện mã ra thì mới thử được.
       * Cấu hình rồi thì mã chỉ nằm trong hộp thư, kể cả ở máy dev.
       */
      ...(!mail.sent && process.env.NODE_ENV !== 'production' && { devCode: code }),
    },
  });
};

/**
 * POST /api/auth/university/confirm
 * Nhận mã 6 số, xác nhận và nâng tài khoản lên 'verified'.
 */
export const confirmVerification = async (req, res) => {
  const { error, value } = confirmSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  // Cần select thêm codeHash vì schema đặt select: false
  const user = await User.findById(req.user._id).select('+verification.codeHash');

  const v = user.verification || {};

  if (!v.codeHash || !v.pendingEmail) {
    return res.status(400).json({
      status: 'error',
      code: 'NO_PENDING_VERIFICATION',
      message: 'Không có yêu cầu xác thực nào đang chờ. Hãy gửi lại mã.',
    });
  }

  if (v.expiresAt && new Date() > new Date(v.expiresAt)) {
    return res.status(400).json({
      status: 'error',
      code: 'CODE_EXPIRED',
      message: 'Mã xác thực đã hết hạn. Hãy gửi lại mã mới.',
    });
  }

  if (v.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã mới.',
    });
  }

  const match = await bcrypt.compare(value.code, v.codeHash);

  if (!match) {
    user.verification.attempts = (v.attempts || 0) + 1;
    await user.save({ validateBeforeSave: false });

    const remaining = MAX_ATTEMPTS - user.verification.attempts;
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_CODE',
      message: 'Mã xác thực không đúng',
      attemptsRemaining: Math.max(0, remaining),
    });
  }

  // Kiểm tra lần cuối trước khi ghi — phòng trường hợp có người khác
  // vừa chiếm mất email này trong lúc chờ
  const university = await University.findByEmail(v.pendingEmail);
  if (!university) {
    return res.status(400).json({
      status: 'error',
      code: 'UNKNOWN_UNIVERSITY_DOMAIN',
      message: 'Không xác định được trường từ email này',
    });
  }

  const taken = await User.findOne({
    universityEmail: v.pendingEmail,
    _id: { $ne: user._id },
  });
  if (taken) {
    return res.status(409).json({
      status: 'error',
      code: 'UNIVERSITY_EMAIL_TAKEN',
      message: 'Email trường này vừa được dùng cho tài khoản khác',
    });
  }

  user.universityEmail = v.pendingEmail;
  user.university = university._id;
  user.verificationStatus = 'verified';
  user.verifiedAt = new Date();
  user.verification = {
    codeHash: null,
    pendingEmail: null,
    expiresAt: null,
    attempts: 0,
    lastSentAt: v.lastSentAt,
    sendCount: v.sendCount,
    windowStartedAt: v.windowStartedAt,
  };

  await user.save();
  await University.updateOne({ _id: university._id }, { $inc: { studentCount: 1 } });

  logger.info(`Xác thực thành công: user ${user._id} → ${university.shortName}`);

  const fresh = await User.findById(user._id).populate(
    'university',
    'name shortName slug city'
  );

  res.status(200).json({
    status: 'success',
    message: `Chào mừng bạn đến với cộng đồng ${university.shortName}`,
    data: { user: fresh.getPublicProfile() },
  });
};

/**
 * GET /api/auth/university/status
 * App gọi khi mở lên để biết nên hiện màn hình nào.
 */
export const getVerificationStatus = async (req, res) => {
  const user = req.user;
  const v = user.verification || {};

  res.status(200).json({
    status: 'success',
    data: {
      verificationStatus: user.verificationStatus,
      university: user.university || null,
      verifiedAt: user.verifiedAt,
      pendingEmail: v.pendingEmail || null,
      codeExpiresAt: v.expiresAt || null,
    },
  });
};
