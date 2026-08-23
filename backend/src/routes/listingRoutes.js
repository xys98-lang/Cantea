import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getListings,
  getMyListings,
  getSavedListings,
  createListing,
  getListing,
  updateListing,
  setStatus,
  bumpListing,
  deleteListing,
  toggleSave,
} from '../controllers/listingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Đăng tin siết chặt hơn đăng bài: mỗi tin là một lời mời hẹn gặp
 * ngoài đời, nên rải tin ở đây nguy hiểm hơn spam bảng tin.
 */
const postLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    code: 'TOO_MANY_LISTINGS',
    message: 'Bạn đã đăng 10 tin hôm nay. Thử lại vào ngày mai.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

/**
 * Route tĩnh phải đứng TRƯỚC '/:id', nếu không '/mine' và '/saved'
 * sẽ bị hiểu là mã tin đăng.
 */
router.get('/mine', getMyListings);
router.get('/saved', getSavedListings);

router.get('/', getListings);
router.post('/', postLimiter, createListing);

router.get('/:id', getListing);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);
router.patch('/:id/status', setStatus);
router.post('/:id/bump', bumpListing);
router.post('/:id/save', toggleSave);

export default router;
