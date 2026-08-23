import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  archiveConversation,
  blockConversation,
  reportConversation,
  getUnreadCount,
  revealIdentity,
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/** Chống rải tin hàng loạt — 60 tin mỗi 15 phút là quá đủ cho người thật */
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    status: 'error',
    code: 'TOO_MANY_MESSAGES',
    message: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng chậm lại.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Mở hội thoại mới siết chặt hơn — đây mới là vector rải tin thật sự */
const startLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: {
    status: 'error',
    code: 'TOO_MANY_CONVERSATIONS',
    message: 'Bạn đã mở quá nhiều hội thoại. Vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

// Đặt trước route có tham số để '/unread' không bị hiểu là id hội thoại
router.get('/unread', getUnreadCount);

router.get('/', getConversations);
router.post('/', startLimiter, startConversation);

router.get('/:id', getMessages);
router.post('/:id', sendLimiter, sendMessage);
router.post('/:id/reveal', revealIdentity);
router.post('/:id/archive', archiveConversation);
router.post('/:id/block', blockConversation);
router.post('/:id/report', reportConversation);

export default router;
