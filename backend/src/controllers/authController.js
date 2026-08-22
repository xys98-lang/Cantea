import Joi from 'joi';
import User from '../models/User.js';
import { generateToken, generateRefreshToken } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

// ===== VALIDATION =====

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Vui lòng nhập email',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
    'any.required': 'Vui lòng nhập mật khẩu',
  }),
  firstName: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Vui lòng nhập tên',
  }),
  lastName: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Vui lòng nhập họ',
  }),
  nickname: Joi.string().trim().max(30).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ===== HANDLERS =====

/**
 * POST /api/auth/register
 * Tạo tài khoản bằng email cá nhân. Không cần email trường.
 * Người dùng mới luôn ở trạng thái 'guest'.
 */
export const register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details.map((d) => d.message),
    });
  }

  const { email, password, firstName, lastName, nickname } = value;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({
      status: 'error',
      code: 'EMAIL_TAKEN',
      message: 'Email này đã được đăng ký',
    });
  }

  const user = await User.create({
    email,
    password, // pre-save hook tự hash
    firstName,
    lastName,
    nickname,
    authProvider: 'local',
    verificationStatus: 'guest',
  });

  logger.info(`Người dùng mới đăng ký: ${user._id}`);

  res.status(201).json({
    status: 'success',
    message: 'Đăng ký thành công',
    data: {
      user: user.getPublicProfile(),
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    },
  });
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const { email, password } = value;

  // BẮT BUỘC .select('+password') vì schema đặt select: false
  const user = await User.findOne({ email })
    .select('+password')
    .populate('university', 'name shortName slug city');

  // Trả về cùng một thông báo cho cả hai trường hợp sai email và sai mật khẩu,
  // tránh để lộ email nào đã tồn tại trong hệ thống.
  const invalidMsg = {
    status: 'error',
    code: 'INVALID_CREDENTIALS',
    message: 'Email hoặc mật khẩu không đúng',
  };

  if (!user) return res.status(401).json(invalidMsg);

  if (!user.isActive) {
    return res.status(403).json({
      status: 'error',
      code: 'ACCOUNT_DISABLED',
      message: 'Tài khoản đã bị vô hiệu hoá',
    });
  }

  const match = await user.comparePassword(password);
  if (!match) return res.status(401).json(invalidMsg);

  user.lastLogin = new Date();
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Đăng nhập thành công',
    data: {
      user: user.getPublicProfile(),
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    },
  });
};

/**
 * GET /api/auth/me
 * req.user đã được middleware protect nạp sẵn.
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user.getPublicProfile() },
  });
};

/**
 * POST /api/auth/logout
 * JWT không thu hồi được ở server nếu chưa có blacklist.
 * Việc xoá token do client thực hiện. Endpoint này để ghi log và
 * giữ chỗ cho cơ chế thu hồi token sau này.
 */
export const logout = async (req, res) => {
  if (req.user) {
    req.user.lastActive = new Date();
    await req.user.save({ validateBeforeSave: false });
  }
  res.status(200).json({ status: 'success', message: 'Đã đăng xuất' });
};
