import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  submitRequest,
  getMyRequests,
  listRequests,
  approveRequest,
  rejectRequest,
} from '../controllers/domainRequestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

/** Gửi yêu cầu là việc hiếm — 5 lần mỗi ngày là quá đủ cho người thật */
const submitLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Bạn đã gửi quá nhiều yêu cầu hôm nay. Thử lại vào ngày mai.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

// Đặt trước '/:id' để '/mine' không bị hiểu là mã yêu cầu
router.get('/mine', getMyRequests);
router.post('/', submitLimiter, submitRequest);

/**
 * Phần quản trị. Đuôi email quyết định ai vào được cộng đồng nào, nên
 * chỉ quản trị viên mới duyệt được — và không có cơ chế tự động duyệt.
 */
router.get('/', authorize('admin'), listRequests);
router.post('/:id/approve', authorize('admin'), approveRequest);
router.post('/:id/reject', authorize('admin'), rejectRequest);

export default router;
