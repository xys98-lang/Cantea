import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getReasons,
  createReport,
  listReports,
  resolveReports,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Giới hạn rộng hơn nhiều so với đăng bài, vì đây là nút an toàn.
 *
 * Người vừa gặp một loạt bài quấy rối cần báo cáo liên tiếp mà không bị chặn.
 * Chặn trùng đã nằm ở unique index trong Report, nên bộ đếm này chỉ để cản kịch
 * bản tự động, không phải để cản người dùng thật.
 */
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: {
    status: 'error',
    code: 'TOO_MANY_REPORTS',
    message: 'Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

/**
 * Không dùng requireVerified ở tầng route, cùng lý do với communityRoutes:
 * quyền phụ thuộc vào phạm vi của từng bài. Bài toàn quốc thì ai đăng nhập cũng
 * báo cáo được; bài của trường thì postAccessError trong controller tự chặn.
 */

// Đặt trước '/posts/:postId' để 'reasons' không bị hiểu là mã bài
router.get('/reasons', getReasons);

router.get('/', listReports);
router.post('/posts/:postId', reportLimiter, createReport);
router.patch('/posts/:postId', resolveReports);

export default router;
