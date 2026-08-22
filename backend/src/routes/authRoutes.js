import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, logout } from '../controllers/authController.js';
import {
  requestVerification,
  confirmVerification,
  getVerificationStatus,
} from '../controllers/verificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Giới hạn riêng cho nhóm auth, chặt hơn nhiều so với mức chung.
 * Chống dò mật khẩu bằng vét cạn.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Bạn đã thử quá nhiều lần. Vui lòng đợi 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== CÔNG KHAI =====
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// ===== CẦN ĐĂNG NHẬP =====
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// ===== XÁC THỰC TRƯỜNG =====
router.post('/university/request', protect, authLimiter, requestVerification);
router.post('/university/confirm', protect, authLimiter, confirmVerification);
router.get('/university/status', protect, getVerificationStatus);

export default router;
