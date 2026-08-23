import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  uploadMiddleware,
  uploadErrorHandler,
  uploadImages,
  deleteImage,
} from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Tải ảnh tốn băng thông và tiền lưu trữ, nên siết chặt hơn các API khác.
 * 40 lượt mỗi giờ đủ cho người dùng thật — một tin đăng 5 ảnh, một bài
 * viết vài ảnh, cộng vài lần thử lại.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: {
    status: 'error',
    code: 'TOO_MANY_UPLOADS',
    message: 'Bạn đã tải quá nhiều ảnh. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

router.post('/', uploadLimiter, uploadMiddleware, uploadErrorHandler, uploadImages);
router.delete('/:publicId', deleteImage);

export default router;
