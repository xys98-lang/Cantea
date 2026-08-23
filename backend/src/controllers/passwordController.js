import Joi from 'joi';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { deliverCode, passwordResetEmail } from '../services/email.js';
import { logger } from '../utils/logger.js';

// ===== CẤU HÌNH — giống luồng xác thực trường để người dùng thấy nhất quán =====
const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 60;
const RESEND_COOLDOWN_SECONDS = 60;
/** Vé đổi mật khẩu sống ngắn — chỉ đủ để gõ mật khẩu mới */
const RESET_TICKET_MINUTES = 10;

const requestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Vui lòng nhập email',
  }),
});

const verifySchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'Mã xác thực gồm 6 chữ số',
    'string.pattern.base': 'Mã xác thực chỉ gồm chữ số',
  }),
});

const resetSchema = Joi.object({
  ticket: Joi.string().required(),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
  }),
});

const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * POST /api/auth/password/request
 *
 * LUÔN trả về thành công, kể cả khi email không tồn tại.
 *
 * Nếu phân biệt "email không tồn tại" với "đã gửi mã", bất kỳ ai cũng dò
 * được danh sách email đã đăng ký Cantea. Với một app xây quanh ẩn danh,
 * để lộ "người này có tài khoản" đã là quá nhiều.
 */
export const requestReset = async (req, res) => {
  const { error, value } = requestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const email = value.email.toLowerCase().trim();
  const ok = {
    status: 'success',
    message: `Nếu ${email} đã đăng ký, mã đặt lại mật khẩu vừa được gửi tới.`,
    data: { expiresInMinutes: CODE_TTL_MINUTES },
  };

  const user = await User.findOne({ email });
  if (!user || !user.isActive) return res.status(200).json(ok);

  // Tài khoản đăng nhập bằng Google không có mật khẩu để đặt lại
  if (user.authProvider === 'google' && !user.password) {
    return res.status(200).json(ok);
  }

  const now = new Date();
  const r = user.passwordReset || {};

  if (r.lastSentAt && now - new Date(r.lastSentAt) < RESEND_COOLDOWN_SECONDS * 1000) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (now - new Date(r.lastSentAt))) / 1000
    );
    return res.status(429).json({
      status: 'error',
      code: 'RESEND_TOO_SOON',
      message: `Vui lòng đợi ${wait} giây trước khi gửi lại`,
      retryAfterSeconds: wait,
    });
  }

  const windowStart = r.windowStartedAt ? new Date(r.windowStartedAt) : null;
  const windowExpired = !windowStart || now - windowStart > SEND_WINDOW_MINUTES * 60 * 1000;

  if (!windowExpired && r.sendCount >= MAX_SENDS_PER_WINDOW) {
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_REQUESTS',
      message: `Bạn đã yêu cầu quá ${MAX_SENDS_PER_WINDOW} lần. Vui lòng thử lại sau 1 giờ.`,
    });
  }

  const code = generateCode();
  user.passwordReset = {
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
    attempts: 0,
    lastSentAt: now,
    sendCount: windowExpired ? 1 : (r.sendCount || 0) + 1,
    windowStartedAt: windowExpired ? now : windowStart,
  };
  await user.save({ validateBeforeSave: false });

  const mail = await deliverCode(email, passwordResetEmail(code));

  /**
   * Khác với xác thực trường: ở đây KHÔNG báo lỗi ra ngoài.
   *
   * Endpoint này luôn trả thành công dù email có tồn tại hay không, để
   * không ai dò được danh sách email đã đăng ký. Báo lỗi gửi mail sẽ phá
   * chính lớp bảo vệ đó — kẻ dò chỉ cần xem cái nào lỗi cái nào không.
   *
   * Lỗi vẫn được ghi log để bạn biết mà xử lý.
   */
  if (!mail.ok) {
    logger.error(`Không gửi được mã đặt lại mật khẩu tới ${email}`);
  }

  res.status(200).json({
    ...ok,
    data: {
      ...ok.data,
      ...(!mail.sent && process.env.NODE_ENV !== 'production' && { devCode: code }),
    },
  });
};

/**
 * POST /api/auth/password/verify
 *
 * Đổi mã 6 số lấy một "vé" sống 10 phút. Nhờ vậy người dùng không phải
 * gõ lại mã ở bước đặt mật khẩu, và mã không nằm lâu trên màn hình.
 */
export const verifyResetCode = async (req, res) => {
  const { error, value } = verifySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const email = value.email.toLowerCase().trim();
  const user = await User.findOne({ email }).select('+passwordReset.codeHash');

  const invalid = {
    status: 'error',
    code: 'INVALID_CODE',
    message: 'Mã không đúng hoặc đã hết hạn',
  };

  if (!user || !user.passwordReset?.codeHash) return res.status(400).json(invalid);

  const r = user.passwordReset;

  if (r.expiresAt && new Date() > new Date(r.expiresAt)) {
    return res.status(400).json({
      status: 'error',
      code: 'CODE_EXPIRED',
      message: 'Mã đã hết hạn. Hãy gửi lại mã mới.',
    });
  }

  if (r.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({
      status: 'error',
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Bạn đã nhập sai quá nhiều lần. Hãy gửi lại mã mới.',
    });
  }

  const match = await bcrypt.compare(value.code, r.codeHash);
  if (!match) {
    user.passwordReset.attempts = (r.attempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    return res.status(400).json({
      ...invalid,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - user.passwordReset.attempts),
    });
  }

  /**
   * Vé được ký kèm dấu vân tay của mật khẩu hiện tại. Nếu mật khẩu đổi
   * bằng đường khác trong 10 phút đó, vé tự mất hiệu lực — không thể
   * dùng một vé cũ để ghi đè mật khẩu mới.
   */
  const fingerprint = crypto
    .createHash('sha256')
    .update(String(user.password || '') + String(user.passwordChangedAt || ''))
    .digest('hex')
    .slice(0, 16);

  const ticket = jwt.sign(
    { id: user._id, purpose: 'password_reset', fp: fingerprint },
    process.env.JWT_SECRET,
    { expiresIn: `${RESET_TICKET_MINUTES}m` }
  );

  res.status(200).json({
    status: 'success',
    message: 'Mã hợp lệ',
    data: { ticket, expiresInMinutes: RESET_TICKET_MINUTES },
  });
};

/**
 * POST /api/auth/password/reset
 */
export const resetPassword = async (req, res) => {
  const { error, value } = resetSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(value.ticket, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({
      status: 'error',
      code: 'TICKET_INVALID',
      message: 'Phiên đặt lại mật khẩu đã hết hạn. Hãy bắt đầu lại.',
    });
  }

  if (decoded.purpose !== 'password_reset') {
    return res.status(400).json({
      status: 'error',
      code: 'TICKET_INVALID',
      message: 'Phiên không hợp lệ',
    });
  }

  const user = await User.findById(decoded.id).select('+password +passwordReset.codeHash');
  if (!user) {
    return res.status(404).json({
      status: 'error',
      code: 'USER_NOT_FOUND',
      message: 'Tài khoản không tồn tại',
    });
  }

  const fingerprint = crypto
    .createHash('sha256')
    .update(String(user.password || '') + String(user.passwordChangedAt || ''))
    .digest('hex')
    .slice(0, 16);

  if (decoded.fp !== fingerprint) {
    return res.status(400).json({
      status: 'error',
      code: 'TICKET_STALE',
      message: 'Mật khẩu đã được đổi bằng cách khác. Hãy bắt đầu lại.',
    });
  }

  // Đặt lại chính mật khẩu cũ thì không giải quyết được gì
  if (await bcrypt.compare(value.password, user.password || '')) {
    return res.status(400).json({
      status: 'error',
      code: 'SAME_PASSWORD',
      message: 'Mật khẩu mới phải khác mật khẩu cũ',
    });
  }

  user.password = value.password; // hook pre-save tự hash và ghi passwordChangedAt
  user.passwordReset = {
    codeHash: null,
    expiresAt: null,
    attempts: 0,
    lastSentAt: null,
    sendCount: 0,
    windowStartedAt: null,
  };
  await user.save();

  logger.info(`Đặt lại mật khẩu thành công: ${user._id}`);

  res.status(200).json({
    status: 'success',
    message: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',
  });
};
