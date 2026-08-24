import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  updateProfile,
  changePassword,
  updateNotifications,
  updatePrivacy,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Chỉ chặn riêng đường đổi mật khẩu, không chặn cả nhóm.
 *
 * Endpoint này nhận mật khẩu hiện tại nên nó là chỗ dò mật khẩu bằng vét cạn —
 * khác với sửa biệt danh, vốn không có gì để dò. Đặt giới hạn chung cho cả
 * nhóm sẽ khiến người chỉnh hồ sơ vài lần liên tiếp bị chặn oan.
 */
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Bạn đã thử quá nhiều lần. Vui lòng đợi 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

/**
 * Không dùng requireVerified: hồ sơ là của riêng mỗi người, không phụ thuộc
 * vào việc đã xác thực trường hay chưa. Guest cũng cần đổi được biệt danh.
 */
router.patch('/me', updateProfile);
router.patch('/me/password', passwordLimiter, changePassword);
router.patch('/me/notifications', updateNotifications);
router.patch('/me/privacy', updatePrivacy);

export default router;
