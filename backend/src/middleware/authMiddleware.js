import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Bắt buộc đăng nhập. Gắn req.user và req.userId.
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        code: 'NO_TOKEN',
        message: 'Bạn cần đăng nhập để tiếp tục',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          code: 'TOKEN_EXPIRED',
          message: 'Phiên đăng nhập đã hết hạn',
        });
      }
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: 'Token không hợp lệ',
      });
    }

    // Bỏ bớt các mảng nặng, không cần cho mỗi request
    const user = await User.findById(decoded.id)
      .select('-friends -blockedUsers')
      .populate('university');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'Tài khoản không tồn tại',
      });
    }

    /**
     * Token phát hành trước lần đổi mật khẩu gần nhất coi như hết hiệu lực.
     * Đây là thứ khiến việc đặt lại mật khẩu thực sự đuổi được kẻ xâm nhập
     * ra khỏi tài khoản, thay vì chỉ chặn lần đăng nhập tiếp theo.
     */
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      return res.status(401).json({
        status: 'error',
        code: 'PASSWORD_CHANGED',
        message: 'Mật khẩu đã được đổi. Vui lòng đăng nhập lại.',
      });
    }

    // Tài khoản bị khoá thì chặn ngay, dù token còn hạn
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_DISABLED',
        message: 'Tài khoản đã bị vô hiệu hoá',
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      code: 'AUTH_ERROR',
      message: 'Lỗi hệ thống khi xác thực',
    });
  }
};

/**
 * Bắt buộc đã xác thực email trường.
 * Dùng cho bảng tin riêng của trường, đăng bài, bình luận.
 * Frontend bắt mã UNIVERSITY_VERIFICATION_REQUIRED để hiện màn hình mời xác thực.
 */
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      code: 'NO_TOKEN',
      message: 'Bạn cần đăng nhập để tiếp tục',
    });
  }

  if (req.user.verificationStatus !== 'verified') {
    return res.status(403).json({
      status: 'error',
      code: 'UNIVERSITY_VERIFICATION_REQUIRED',
      message: 'Bạn cần xác thực email trường để tham gia cộng đồng này',
      currentStatus: req.user.verificationStatus,
    });
  }

  next();
};

/**
 * Phân quyền theo vai trò: authorize('admin', 'moderator')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 'NO_TOKEN',
        message: 'Bạn cần đăng nhập để tiếp tục',
      });
    }

    const hasRole = (req.user.roles || []).some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập',
      });
    }
    next();
  };
};

// ===== TOKEN =====

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id: userId, type: 'refresh' }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

export const verifyRefreshToken = (token) => {
  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};
