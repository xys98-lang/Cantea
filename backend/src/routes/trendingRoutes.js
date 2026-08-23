import express from 'express';
import {
  getTrending,
  getMyTrending,
  toggleExclude,
} from '../controllers/trendingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Đặt trước '/:...' để không bị hiểu là tham số
router.get('/mine', getMyTrending);

router.get('/', getTrending);
router.post('/exclude/:postId', toggleExclude);

export default router;
