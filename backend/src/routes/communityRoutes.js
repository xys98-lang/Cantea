import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getFeed,
  createPost,
  getPost,
  deletePost,
  togglePostLike,
  getComments,
  createComment,
  deleteComment,
  toggleCommentLike,
} from '../controllers/communityController.js';
import { protect, requireVerified } from '../middleware/authMiddleware.js';

const router = express.Router();

/** Chống spam đăng bài — 10 bài mỗi giờ là quá đủ cho người dùng thật */
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    code: 'TOO_MANY_POSTS',
    message: 'Bạn đã đăng quá nhiều bài. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Bình luận thoáng hơn, nhưng vẫn có trần */
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    status: 'error',
    code: 'TOO_MANY_COMMENTS',
    message: 'Bạn đã bình luận quá nhiều. Vui lòng chậm lại.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mọi route đều cần đăng nhập
router.use(protect);

// ===== ĐỌC =====
// Guest xem được bảng tin global; scope=university tự kiểm tra bên trong controller
router.get('/feed', getFeed);
router.get('/posts/:id', getPost);
router.get('/posts/:id/comments', getComments);

// ===== VIẾT — bắt buộc đã xác thực email trường =====
router.post('/posts', requireVerified, writeLimiter, createPost);
router.delete('/posts/:id', requireVerified, deletePost);
router.post('/posts/:id/like', requireVerified, togglePostLike);

router.post('/posts/:id/comments', requireVerified, commentLimiter, createComment);
router.delete('/comments/:id', requireVerified, deleteComment);
router.post('/comments/:id/like', requireVerified, toggleCommentLike);

export default router;
