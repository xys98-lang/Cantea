import express from 'express';
import {
  getSchedule,
  getToday,
  createCourse,
  updateCourse,
  deleteCourse,
  getPeriods,
  setPeriods,
  resetPeriods,
  setTimeDisplay,
} from '../controllers/scheduleController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Chỉ cần đăng nhập — KHÔNG cần xác thực email trường.
 *
 * Thời khoá biểu là dữ liệu cá nhân, dùng được một mình,
 * có giá trị ngay từ phút đầu. Đây là lý do để tân sinh viên
 * ở lại với app trong 2–6 tuần chờ trường cấp mail.
 */
router.use(protect);

// Khung tiết — đặt TRƯỚC route /:id để '/periods' không bị hiểu là một id
router.get('/periods', getPeriods);
router.put('/periods', setPeriods);
router.delete('/periods', resetPeriods);

router.put('/display', setTimeDisplay);
router.get('/today', getToday);

router.get('/', getSchedule);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
