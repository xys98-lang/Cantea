import express from 'express';
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  savePost,
  unsavePost,
  getSaved,
} from '../controllers/bookmarkController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Lưu bài là công cụ cá nhân, không phải hoạt động cộng đồng —
 * nên chỉ cần đăng nhập, không cần xác thực trường. Guest đọc được
 * bảng tin toàn quốc thì cũng phải lưu được bài trong đó.
 */
router.use(protect);

// Đặt TRƯỚC các route có tham số để '/collections' không bị hiểu là postId
router.get('/collections', getCollections);
router.post('/collections', createCollection);
router.put('/collections/:id', updateCollection);
router.delete('/collections/:id', deleteCollection);

router.get('/', getSaved);
router.post('/', savePost);
router.delete('/:postId', unsavePost);

export default router;
