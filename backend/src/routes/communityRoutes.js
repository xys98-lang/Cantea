import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getFeed,
  getTopics,
  getPostQuota,
  getMyPosts,
  createPost,
  getPost,
  deletePost,
  togglePostLike,
  getComments,
  createComment,
  deleteComment,
  toggleCommentLike,
} from '../controllers/communityController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

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

router.use(protect);

/**
 * KHÔNG dùng requireVerified ở tầng route nữa.
 *
 * Quyền phụ thuộc vào PHẠM VI của từng bài, không phải vào endpoint:
 *   - Bài toàn quốc: ai đăng nhập cũng đọc và tham gia được
 *   - Bài của trường: bắt buộc đã xác thực và đúng trường
 *
 * Chặn cứng ở đây sẽ khiến bảng tin toàn quốc trống vĩnh viễn,
 * vì chỉ người đã xác thực mới đăng được — mà họ thì đăng vào
 * bảng tin trường mình. Controller tự kiểm tra từng trường hợp.
 */

// Đọc
router.get('/topics', getTopics);
router.get('/quota', getPostQuota);

// Đặt trước '/posts/:id' để 'mine' không bị hiểu là mã bài
router.get('/posts/mine', getMyPosts);
router.get('/feed', getFeed);
router.get('/posts/:id', getPost);
router.get('/posts/:id/comments', getComments);

// Viết
router.post('/posts', writeLimiter, createPost);
router.delete('/posts/:id', deletePost);
router.post('/posts/:id/like', togglePostLike);

router.post('/posts/:id/comments', commentLimiter, createComment);
router.delete('/comments/:id', deleteComment);
router.post('/comments/:id/like', toggleCommentLike);

export default router;
