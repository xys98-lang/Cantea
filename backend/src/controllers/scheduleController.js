import Joi from 'joi';
import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import {
  DEFAULT_PERIODS,
  resolvePeriods,
  periodsToTime,
  timeToPeriods,
  toMinutes,
  isValidTime,
  jsDayToVn,
} from '../utils/periods.js';
import { logger } from '../utils/logger.js';

/** Bảng màu cho các môn trên lưới thời khoá biểu */
const COURSE_COLORS = [
  '#6366F1',
  '#0EA5E9',
  '#14B8A6',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#10B981',
  '#F43F5E',
];

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Một buổi học nhập được theo hai cách:
 *   - theo tiết: fromPeriod + toPeriod
 *   - theo giờ:  startTime + endTime
 * Bắt buộc chọn một trong hai, không phải cả hai.
 */
const meetingInput = Joi.object({
  dayOfWeek: Joi.number().integer().min(2).max(8).required().messages({
    'any.required': 'Chọn thứ trong tuần',
  }),
  fromPeriod: Joi.number().integer().min(1).max(30),
  toPeriod: Joi.number().integer().min(1).max(30),
  startTime: Joi.string().pattern(timePattern),
  endTime: Joi.string().pattern(timePattern),
  room: Joi.string().trim().max(50).allow('').default(''),
  building: Joi.string().trim().max(50).allow('').default(''),
  note: Joi.string().trim().max(200).allow('').default(''),
})
  .or('fromPeriod', 'startTime')
  .messages({ 'object.missing': 'Nhập tiết học hoặc giờ học' });

const courseInput = Joi.object({
  courseName: Joi.string().trim().min(1).max(120).required().messages({
    'any.required': 'Nhập tên môn học',
  }),
  courseCode: Joi.string().trim().max(30).allow('').default(''),
  classCode: Joi.string().trim().max(30).allow('').default(''),
  instructor: Joi.string().trim().max(100).allow('').default(''),
  credits: Joi.number().min(0).max(20).allow(null).default(null),
  meetings: Joi.array().items(meetingInput).min(1).max(10).required().messages({
    'array.min': 'Cần ít nhất một buổi học',
  }),
  term: Joi.string().valid('HK1', 'HK2', 'HK3').default('HK1'),
  academicYear: Joi.string().trim().max(20).allow('').default(''),
  color: Joi.string().trim().max(20).allow(null, ''),
  reminderEnabled: Joi.boolean().default(true),
  reminderMinutes: Joi.number().valid(0, 15, 30, 60).default(15),
});

const periodsInput = Joi.object({
  periods: Joi.array()
    .items(
      Joi.object({
        period: Joi.number().integer().min(1).max(30).required(),
        start: Joi.string().pattern(timePattern).required(),
        end: Joi.string().pattern(timePattern).required(),
        session: Joi.string().valid('morning', 'afternoon', 'evening').default('morning'),
      })
    )
    .min(1)
    .max(30)
    .required(),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

/** Quy đổi tiết sang giờ, kiểm tra hợp lệ */
const normalizeMeetings = (meetings, periods) => {
  const out = [];

  for (const m of meetings) {
    let startTime = m.startTime;
    let endTime = m.endTime;

    if (m.fromPeriod) {
      const to = m.toPeriod || m.fromPeriod;
      const converted = periodsToTime(periods, m.fromPeriod, to);
      if (!converted) {
        throw Object.assign(new Error(`Tiết ${m.fromPeriod}–${to} không có trong khung tiết`), {
          code: 'INVALID_PERIOD',
        });
      }
      startTime = converted.startTime;
      endTime = converted.endTime;
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      throw Object.assign(new Error('Giờ học không hợp lệ'), { code: 'INVALID_TIME' });
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      throw Object.assign(new Error('Giờ kết thúc phải sau giờ bắt đầu'), {
        code: 'INVALID_TIME_RANGE',
      });
    }

    out.push({
      dayOfWeek: m.dayOfWeek,
      startTime,
      endTime,
      room: m.room || '',
      building: m.building || '',
      note: m.note || '',
    });
  }

  return out;
};

/** Tìm các buổi học đè lên nhau. Chỉ cảnh báo, không chặn — lịch bù là chuyện thường. */
const findConflicts = (newMeetings, existingCourses, skipId = null) => {
  const conflicts = [];

  for (const nm of newMeetings) {
    for (const course of existingCourses) {
      if (skipId && String(course._id) === String(skipId)) continue;

      for (const em of course.meetings) {
        if (em.dayOfWeek !== nm.dayOfWeek) continue;

        const overlap =
          toMinutes(nm.startTime) < toMinutes(em.endTime) &&
          toMinutes(em.startTime) < toMinutes(nm.endTime);

        if (overlap) {
          conflicts.push({
            with: course.courseName,
            dayOfWeek: nm.dayOfWeek,
            time: `${em.startTime}–${em.endTime}`,
          });
        }
      }
    }
  }

  return conflicts;
};

/** Gắn thông tin tiết vào từng buổi để frontend hiển thị được cả hai kiểu */
const decorate = (course, periods) => {
  const c = course.toObject ? course.toObject() : course;
  c.meetings = (c.meetings || []).map((m) => ({
    ...m,
    periods: timeToPeriods(periods, m.startTime, m.endTime), // null nếu không khớp khung
  }));
  return c;
};

// ===== HANDLERS =====

/**
 * GET /api/schedule
 * Trả về toàn bộ môn học kèm khung tiết đang áp dụng.
 */
export const getSchedule = async (req, res) => {
  const periods = resolvePeriods(req.user);
  const filter = { student: req.user._id, isArchived: false };

  if (req.query.term) filter.term = req.query.term;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;

  const courses = await Schedule.find(filter).sort({ createdAt: 1 });

  res.status(200).json({
    status: 'success',
    data: {
      courses: courses.map((c) => decorate(c, periods)),
      periods,
      timeDisplay: req.user.preferences?.timeDisplay || 'period',
    },
  });
};

/**
 * GET /api/schedule/today
 * Buổi học hôm nay, sắp theo giờ. Dùng cho màn hình chính.
 */
export const getToday = async (req, res) => {
  const periods = resolvePeriods(req.user);
  const today = jsDayToVn(new Date().getDay());

  const courses = await Schedule.find({
    student: req.user._id,
    isArchived: false,
    'meetings.dayOfWeek': today,
  });

  const items = [];
  for (const course of courses) {
    for (const m of course.meetings) {
      if (m.dayOfWeek !== today) continue;
      items.push({
        courseId: course._id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        instructor: course.instructor,
        color: course.color,
        room: m.room,
        building: m.building,
        startTime: m.startTime,
        endTime: m.endTime,
        periods: timeToPeriods(periods, m.startTime, m.endTime),
      });
    }
  }

  items.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  res.status(200).json({
    status: 'success',
    data: { dayOfWeek: today, classes: items, periods },
  });
};

/**
 * POST /api/schedule
 */
export const createCourse = async (req, res) => {
  const { error, value } = courseInput.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details.map((d) => d.message),
    });
  }

  const periods = resolvePeriods(req.user);

  let meetings;
  try {
    meetings = normalizeMeetings(value.meetings, periods);
  } catch (e) {
    return res.status(400).json({
      status: 'error',
      code: e.code || 'INVALID_MEETING',
      message: e.message,
    });
  }

  const existing = await Schedule.find({
    student: req.user._id,
    isArchived: false,
    term: value.term,
  });

  const conflicts = findConflicts(meetings, existing);

  // Màu tự động, cố gắng không trùng với các môn đã có
  const used = new Set(existing.map((c) => c.color).filter(Boolean));
  const color =
    value.color || COURSE_COLORS.find((c) => !used.has(c)) || COURSE_COLORS[existing.length % COURSE_COLORS.length];

  const course = await Schedule.create({
    ...value,
    meetings,
    color,
    student: req.user._id,
  });

  logger.info(`Thêm môn vào TKB: ${course._id}`);

  res.status(201).json({
    status: 'success',
    message: 'Đã thêm môn học',
    data: {
      course: decorate(course, periods),
      // Trùng lịch chỉ cảnh báo — sinh viên có thể cố ý đăng ký lịch chồng
      conflicts,
    },
  });
};

/**
 * PUT /api/schedule/:id
 */
export const updateCourse = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const { error, value } = courseInput.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const course = await Schedule.findOne({ _id: req.params.id, student: req.user._id });
  if (!course) {
    return res.status(404).json({
      status: 'error',
      code: 'COURSE_NOT_FOUND',
      message: 'Không tìm thấy môn học',
    });
  }

  const periods = resolvePeriods(req.user);

  let meetings;
  try {
    meetings = normalizeMeetings(value.meetings, periods);
  } catch (e) {
    return res.status(400).json({
      status: 'error',
      code: e.code || 'INVALID_MEETING',
      message: e.message,
    });
  }

  const existing = await Schedule.find({
    student: req.user._id,
    isArchived: false,
    term: value.term,
  });
  const conflicts = findConflicts(meetings, existing, course._id);

  Object.assign(course, value, { meetings });
  await course.save();

  res.status(200).json({
    status: 'success',
    message: 'Đã cập nhật môn học',
    data: { course: decorate(course, periods), conflicts },
  });
};

/**
 * DELETE /api/schedule/:id
 */
export const deleteCourse = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

  const deleted = await Schedule.findOneAndDelete({
    _id: req.params.id,
    student: req.user._id,
  });

  if (!deleted) {
    return res.status(404).json({
      status: 'error',
      code: 'COURSE_NOT_FOUND',
      message: 'Không tìm thấy môn học',
    });
  }

  res.status(200).json({ status: 'success', message: 'Đã xoá môn học' });
};

// ===== KHUNG TIẾT =====

/**
 * GET /api/schedule/periods
 */
export const getPeriods = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      periods: resolvePeriods(req.user),
      isCustom: Boolean(req.user.periodSchedule?.length),
      defaults: DEFAULT_PERIODS,
    },
  });
};

/**
 * PUT /api/schedule/periods
 * Lưu khung tiết riêng của người dùng.
 *
 * LƯU Ý: các môn đã nhập KHÔNG bị ảnh hưởng, vì database lưu giờ
 * chứ không lưu tiết. Đổi khung chỉ đổi cách hiển thị.
 */
export const setPeriods = async (req, res) => {
  const { error, value } = periodsInput.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const sorted = [...value.periods].sort((a, b) => a.period - b.period);

  for (const p of sorted) {
    if (toMinutes(p.end) <= toMinutes(p.start)) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_PERIOD_RANGE',
        message: `Tiết ${p.period}: giờ kết thúc phải sau giờ bắt đầu`,
      });
    }
  }

  await User.updateOne({ _id: req.user._id }, { $set: { periodSchedule: sorted } });

  res.status(200).json({
    status: 'success',
    message: 'Đã lưu khung tiết',
    data: { periods: sorted },
  });
};

/**
 * DELETE /api/schedule/periods — quay về khung mặc định hoặc khung của trường
 */
export const resetPeriods = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { periodSchedule: [] } });
  const fresh = await User.findById(req.user._id).populate('university', 'periodSchedule');
  res.status(200).json({
    status: 'success',
    message: 'Đã khôi phục khung tiết mặc định',
    data: { periods: resolvePeriods(fresh) },
  });
};

/**
 * PUT /api/schedule/display — đổi kiểu hiển thị: theo tiết hay theo giờ
 */
export const setTimeDisplay = async (req, res) => {
  const mode = req.body.timeDisplay;
  if (!['period', 'clock'].includes(mode)) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: "Chỉ nhận 'period' hoặc 'clock'",
    });
  }

  await User.updateOne(
    { _id: req.user._id },
    { $set: { 'preferences.timeDisplay': mode } }
  );

  res.status(200).json({ status: 'success', data: { timeDisplay: mode } });
};
