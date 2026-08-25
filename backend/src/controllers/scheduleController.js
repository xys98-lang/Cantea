import Joi from 'joi';
import mongoose from 'mongoose';
import Schedule from '../models/Schedule.js';
import User from '../models/User.js';
import CourseOffering from '../models/CourseOffering.js';
import {
  DEFAULT_PERIODS,
  resolvePeriods,
  periodsToTime,
  timeToPeriods,
  toMinutes,
  isValidTime,
  jsDayToVn,
} from '../utils/periods.js';
import { parseUEH } from '../utils/uehParser.js';
import { logger } from '../utils/logger.js';

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

const meetingInput = Joi.object({
  /**
   * Buổi một lần không cần chọn thứ — thứ suy ra từ ngày. Bắt chọn cả hai là
   * mở đường cho dữ liệu tự mâu thuẫn: ngày 12/04 mà thứ ghi là Thứ Ba.
   */
  repeats: Joi.boolean().default(true),
  date: Joi.date().iso().when('repeats', {
    is: false,
    then: Joi.required().messages({ 'any.required': 'Chọn ngày diễn ra buổi này' }),
    otherwise: Joi.forbidden(),
  }),
  dayOfWeek: Joi.number().integer().min(2).max(8).when('repeats', {
    is: false,
    then: Joi.optional(),
    otherwise: Joi.required().messages({ 'any.required': 'Chọn thứ trong tuần' }),
  }),
  fromPeriod: Joi.number().integer().min(1).max(30),
  toPeriod: Joi.number().integer().min(1).max(30),
  startTime: Joi.string().pattern(timePattern),
  endTime: Joi.string().pattern(timePattern),
  /**
   * Không uppercase và nới lên 60: ô cơ sở cho phép tự gõ tên có dấu như
   * "Bình Dương". Phải khớp với ràng buộc trong Schedule.js, lệch một bên là
   * dữ liệu bị cắt hoặc viết hoa mà không ai biết vì sao.
   */
  campus: Joi.string().trim().max(60).allow('').default(''),
  /**
   * Tên riêng của buổi. Chỉ có nghĩa với buổi một lần — buổi lặp mà mang tên
   * khác tên môn thì lịch đọc lên mâu thuẫn với chính nó.
   */
  label: Joi.string().trim().max(120).allow('').default(''),
  skipDates: Joi.array().items(Joi.date().iso()).max(60).default([]),
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
  // Có tính lại giờ các môn đã nhập theo khung mới không
  remapCourses: Joi.boolean().default(false),
});

const termInput = Joi.object({
  startDate: Joi.date().iso().allow(null).required(),
  endDate: Joi.date().iso().allow(null).required(),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

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

    /**
     * Buổi một lần: thứ suy ra từ ngày, không tin vào dayOfWeek client gửi lên.
     * Lưới lịch xếp theo dayOfWeek nên buổi thi vẫn nằm đúng cột mà phần vẽ lưới
     * không cần biết có hai loại buổi.
     */
    const repeats = m.repeats !== false;
    const date = repeats ? null : new Date(m.date);
    const dayOfWeek = repeats ? m.dayOfWeek : jsDayToVn(date.getDay());

    out.push({
      dayOfWeek,
      repeats,
      date,
      /* Buổi lặp không mang tên riêng; buổi một lần không có ngày nghỉ */
      label: repeats ? '' : (m.label || '').trim(),
      skipDates: repeats ? (m.skipDates || []).map((d) => new Date(d)) : [],
      startTime,
      endTime,
      campus: m.campus || '',
      room: m.room || '',
      building: m.building || '',
      note: m.note || '',
    });
  }

  return out;
};

/** Buổi học đè lên nhau. Chỉ cảnh báo, không chặn — lịch bù là chuyện thường. */
const findConflicts = (newMeetings, existingCourses, skipId = null) => {
  const conflicts = [];

  for (const nm of newMeetings) {
    for (const course of existingCourses) {
      if (skipId && String(course._id) === String(skipId)) continue;

      for (const em of course.meetings) {
        if (em.dayOfWeek !== nm.dayOfWeek) continue;

        /**
         * Buổi một lần chỉ đè lên buổi khác nếu rơi vào ĐÚNG ngày đó.
         *
         * Không lọc thì buổi thi sáng 12/04 sẽ báo trùng với mọi buổi Thứ Bảy
         * của cả học kỳ — một cảnh báo đúng về mặt thứ nhưng sai về thực tế, và
         * cảnh báo sai vài lần là người dùng thôi đọc chúng.
         */
        const sameDay = (a, b) => {
          if (a.repeats !== false && b.repeats !== false) return true;
          if (a.repeats === false && b.repeats === false) {
            return new Date(a.date).toDateString() === new Date(b.date).toDateString();
          }
          return true;
        };
        if (!sameDay(nm, em)) continue;

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

/**
 * Rà toàn bộ thời khoá biểu, trả về các cặp buổi học đè lên nhau.
 *
 * Trước đây trùng lịch chỉ được báo đúng lúc thêm môn, rồi biến mất.
 * Sinh viên thêm môn A, bỏ qua cảnh báo, tuần sau mở app lại thì không
 * còn dấu vết gì — đến lúc bỏ lỡ buổi học mới biết. Nay cảnh báo nằm
 * lại trên màn thời khoá biểu cho tới khi được xử lý.
 */
const detectAllConflicts = (courses, periods) => {
  const slots = [];

  courses.forEach((c) => {
    (c.meetings || []).forEach((m) => {
      slots.push({
        courseId: String(c._id),
        name: c.courseName,
        dayOfWeek: m.dayOfWeek,
        repeats: m.repeats !== false,
        date: m.date || null,
        start: toMinutes(m.startTime),
        end: toMinutes(m.endTime),
        startTime: m.startTime,
        endTime: m.endTime,
      });
    });
  });

  const out = [];
  const seen = new Set();

  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const a = slots[i];
      const b = slots[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (a.courseId === b.courseId) continue;

      /**
       * Hai buổi một lần chỉ đè nhau nếu rơi vào ĐÚNG cùng ngày. Không lọc thì
       * buổi thi 12/04 báo trùng với mọi buổi Thứ Bảy của cả học kỳ — đúng về
       * thứ nhưng sai về thực tế, và cảnh báo sai vài lần là người dùng thôi đọc.
       */
      if (!a.repeats && !b.repeats) {
        if (new Date(a.date).toDateString() !== new Date(b.date).toDateString()) continue;
      }
      if (a.start >= b.end || b.start >= a.end) continue;

      // Một cặp môn trùng nhiều buổi chỉ báo một lần cho mỗi ngày
      const key = [a.courseId, b.courseId].sort().join('|') + a.dayOfWeek;
      if (seen.has(key)) continue;
      seen.add(key);

      const overlapStart = Math.max(a.start, b.start);
      const overlapEnd = Math.min(a.end, b.end);
      const fmt = (mins) =>
        `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

      out.push({
        type: 'overlap',
        dayOfWeek: a.dayOfWeek,
        courses: [
          { id: a.courseId, name: a.name },
          { id: b.courseId, name: b.name },
        ],
        courseIds: [a.courseId, b.courseId],
        startTime: fmt(overlapStart),
        endTime: fmt(overlapEnd),
        periods: timeToPeriods(periods, fmt(overlapStart), fmt(overlapEnd)),
      });
    }
  }

  return out;
};

/**
 * Tìm những buổi liền nhau ở hai cơ sở khác nhau mà không đủ thời gian đi.
 *
 * Đây là lỗi lịch mà không hệ thống nào của trường báo, vì cổng đăng ký
 * học phần chỉ kiểm tra trùng giờ chứ không biết hai phòng cách nhau bao xa.
 * Sinh viên chỉ phát hiện ra khi đã đứng ở cổng sai.
 *
 * Không tính khoảng cách thật — chỉ so khoảng nghỉ với một ngưỡng chung
 * của trường. Đủ để cảnh báo, và không giả vờ chính xác hơn thực tế.
 */
const detectCommuteIssues = (courses, university) => {
  if (!university?.campuses?.length) return [];

  /**
   * university có thể là plain object khi đã qua .lean(), lúc đó không
   * còn method travelBetween. Dựng lại logic tra bảng ở đây cho chắc.
   */
  const travel = (a, b) => {
    if (!a || !b) return 0;
    const from = String(a).toUpperCase();
    const to = String(b).toUpperCase();
    if (from === to) return 0;

    const hit = (university.campusTravel || []).find(
      (p) =>
        (String(p.from).toUpperCase() === from && String(p.to).toUpperCase() === to) ||
        (String(p.from).toUpperCase() === to && String(p.to).toUpperCase() === from)
    );
    return hit ? hit.minutes : university.campusTravelMinutes || 0;
  };

  const byDay = {};
  courses.forEach((c) => {
    (c.meetings || []).forEach((m) => {
      if (!m.campus) return; // không khai cơ sở thì không đoán bừa
      (byDay[m.dayOfWeek] ||= []).push({
        courseId: String(c._id),
        name: c.courseName,
        campus: m.campus,
        start: toMinutes(m.startTime),
        end: toMinutes(m.endTime),
        startTime: m.startTime,
        endTime: m.endTime,
      });
    });
  });

  const out = [];
  Object.entries(byDay).forEach(([day, list]) => {
    const sorted = list.sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.campus === b.campus) continue;

      const need = travel(a.campus, b.campus);
      if (!need) continue;

      const gap = b.start - a.end;
      if (gap >= need) continue;

      out.push({
        type: 'commute',
        dayOfWeek: Number(day),
        courses: [
          { id: a.courseId, name: a.name },
          { id: b.courseId, name: b.name },
        ],
        courseIds: [a.courseId, b.courseId],
        from: a.campus,
        to: b.campus,
        gapMinutes: Math.max(0, gap),
        needMinutes: need,
        endTime: a.endTime,
        startTime: b.startTime,
      });
    }
  });

  return out;
};

const decorate = (course, periods) => {
  const c = course.toObject ? course.toObject() : course;
  c.meetings = (c.meetings || []).map((m) => ({
    ...m,
    periods: timeToPeriods(periods, m.startTime, m.endTime),
  }));
  return c;
};

// ===== HANDLERS =====

/** Thứ Hai của tuần chứa ngày này, đặt về 00:00 để so ngày không dính giờ */
const mondayOf = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // getDay(): 0 = CN. Lùi về Thứ Hai: CN lùi 6, còn lại lùi (day - 1)
  x.setDate(x.getDate() - (x.getDay() === 0 ? 6 : x.getDay() - 1));
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const sameDay = (a, b) =>
  a && b && new Date(a).toDateString() === new Date(b).toDateString();

/**
 * Khoảng thời gian buổi lặp có hiệu lực.
 *
 * Đặt mốc học kỳ rồi thì dùng mốc đó. Chưa đặt thì neo vào ngày sinh viên nhập
 * môn sớm nhất, kéo dài ba tháng — mốc cố định nên xem lại tuần cũ vẫn đúng,
 * khác với việc đếm từ hôm nay vốn trôi theo từng ngày.
 */
const termRange = (user, courses) => {
  const t = user.term || {};
  if (t.startDate && t.endDate) {
    return { start: new Date(t.startDate), end: new Date(t.endDate), isSet: true };
  }

  const stamps = [];
  courses.forEach((c) => {
    stamps.push(new Date(c.createdAt));
    (c.meetings || []).forEach((m) => {
      if (m.repeats === false && m.date) stamps.push(new Date(m.date));
    });
  });

  const start = stamps.length ? new Date(Math.min(...stamps)) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  return { start, end, isSet: false };
};

/**
 * Bung thời khoá biểu thành các buổi THẬT của một tuần cụ thể.
 *
 * Tính ở backend chứ không để mobile tự làm: nhắc lịch bằng thông báo chạy lúc
 * app đóng, mũi tên chuyển tuần và mốc học kỳ đều cần đúng phép tính này. Ba
 * bản sao của cùng một quy tắc thì sớm muộn cũng lệch nhau.
 */
const buildWeek = (courses, periods, monday, range) => {
  const days = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(monday, i);
    const vnDay = jsDayToVn(date.getDay());
    const items = [];

    courses.forEach((c) => {
      (c.meetings || []).forEach((m) => {
        const isOneOff = m.repeats === false;

        if (isOneOff) {
          if (!sameDay(m.date, date)) return;
        } else {
          if (m.dayOfWeek !== vnDay) return;
          if (date < range.start || date > range.end) return;
          if ((m.skipDates || []).some((sd) => sameDay(sd, date))) return;
        }

        items.push({
          courseId: String(c._id),
          meetingId: String(m._id),
          name: m.label || c.courseName,
          courseName: c.courseName,
          instructor: c.instructor,
          color: c.color,
          room: m.room,
          building: m.building,
          campus: m.campus,
          startTime: m.startTime,
          endTime: m.endTime,
          periods: timeToPeriods(periods, m.startTime, m.endTime),
          repeats: !isOneOff,
        });
      });
    });

    items.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    days.push({ date: date.toISOString().slice(0, 10), dayOfWeek: vnDay, items });
  }

  return days;
};

export const getSchedule = async (req, res) => {
  const periods = resolvePeriods(req.user);
  const filter = { student: req.user._id, isArchived: false };

  if (req.query.term) filter.term = req.query.term;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;

  const courses = await Schedule.find(filter).sort({ createdAt: 1 });

  /**
   * Tham số week là một ngày bất kỳ trong tuần muốn xem; không truyền thì lấy
   * tuần hiện tại. Nhờ vậy màn lịch cũ chưa biết gì về tuần vẫn gọi được như cũ.
   */
  const anchor = req.query.week ? new Date(req.query.week) : new Date();
  const monday = mondayOf(Number.isNaN(anchor.getTime()) ? new Date() : anchor);
  const range = termRange(req.user, courses);

  const prevMonday = addDays(monday, -7);
  const nextMonday = addDays(monday, 7);

  res.status(200).json({
    status: 'success',
    data: {
      /** Giữ lại để các màn đang dùng không gãy trong lúc chuyển đổi */
      courses: courses.map((c) => decorate(c, periods)),

      week: {
        monday: monday.toISOString().slice(0, 10),
        days: buildWeek(courses, periods, monday, range),
        /**
         * Mũi tên tắt khi cả tuần nằm ngoài học kỳ. So với Thứ Hai và Chủ nhật
         * của tuần đích chứ không so với chính mốc — tuần chứa ngày kết thúc vẫn
         * phải xem được, dù phần lớn tuần đó đã hết học kỳ.
         */
        canGoPrev: addDays(prevMonday, 6) >= range.start,
        canGoNext: nextMonday <= range.end,
      },

      term: {
        startDate: range.start.toISOString().slice(0, 10),
        endDate: range.end.toISOString().slice(0, 10),
        /** false thì mobile hiện dòng nhắc đặt mốc học kỳ */
        isSet: range.isSet,
      },

      periods,
      timeDisplay: req.user.preferences?.timeDisplay || 'period',
      conflicts: [
        ...detectAllConflicts(courses, periods),
        ...detectCommuteIssues(courses, req.user.university),
      ],
      campuses: req.user.university?.campuses || [],
    },
  });
};

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

  const used = new Set(existing.map((c) => c.color).filter(Boolean));
  const color =
    value.color ||
    COURSE_COLORS.find((c) => !used.has(c)) ||
    COURSE_COLORS[existing.length % COURSE_COLORS.length];

  const course = await Schedule.create({
    ...value,
    meetings,
    color,
    student: req.user._id,
  });

  logger.info(`Thêm môn vào TKB: ${course._id}`);
  contributeToCatalog(req.user, { ...value, meetings });

  res.status(201).json({
    status: 'success',
    message: 'Đã thêm môn học',
    data: { course: decorate(course, periods), conflicts },
  });
};

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

/** GET /api/schedule/term */
export const getTerm = async (req, res) => {
  const term = req.user.term || {};
  res.status(200).json({
    status: 'success',
    data: {
      startDate: term.startDate || null,
      endDate: term.endDate || null,
      isSet: Boolean(term.startDate && term.endDate),
    },
  });
};

/**
 * PUT /api/schedule/term
 *
 * Cho xoá cả hai để quay về trạng thái chưa đặt, nhưng không cho đặt một nửa:
 * một mốc đơn lẻ không trả lời được câu hỏi nào — không biết tuần nào là tuần
 * đầu, cũng không biết khi nào hết học kỳ.
 */
export const setTerm = async (req, res) => {
  const { error, value } = termInput.validate(req.body);
  if
(error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const { startDate, endDate } = value;

  if (Boolean(startDate) !== Boolean(endDate)) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Cần cả ngày bắt đầu và ngày kết thúc',
    });
  }

  if (startDate && new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Ngày kết thúc phải sau ngày bắt đầu',
    });
  }

  req.user.term = { startDate: startDate || null, endDate: endDate || null };
  await req.user.save();

  res.status(200).json({
    status: 'success',
    message: startDate ? 'Đã lưu mốc học kỳ' : 'Đã xoá mốc học kỳ',
    data: {
      startDate: req.user.term.startDate,
      endDate: req.user.term.endDate,
      isSet: Boolean(startDate),
    },
  });
};

export const getPeriods = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      periods: resolvePeriods(req.user),
      isCustom: Boolean(req.user.periodSchedule?.length),
      fromUniversity: Boolean(
        !req.user.periodSchedule?.length && req.user.university?.periodSchedule?.length
      ),
      defaults: DEFAULT_PERIODS,
    },
  });
};

/**
 * PUT /api/schedule/periods
 *
 * Database lưu GIỜ, không lưu tiết — nên đổi khung không làm mất dữ liệu.
 * Nhưng môn nhập theo tiết cũ sẽ không còn khớp tiết nào trong khung mới,
 * và sẽ hiện ra dưới dạng giờ thay vì "Tiết 1–3".
 *
 * remapCourses = true thì tính lại: với mỗi buổi học, tra xem nó thuộc
 * tiết nào trong khung CŨ, rồi gán giờ tương ứng của tiết đó trong khung MỚI.
 * Buổi nào không khớp tiết nào (lịch bù, học ngoài giờ) thì giữ nguyên.
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

  const oldPeriods = resolvePeriods(req.user);
  let remapped = 0;

  if (value.remapCourses) {
    const courses = await Schedule.find({ student: req.user._id, isArchived: false });

    for (const course of courses) {
      let changed = false;

      course.meetings.forEach((m) => {
        const oldRange = timeToPeriods(oldPeriods, m.startTime, m.endTime);
        if (!oldRange) return; // không khớp tiết nào — giữ nguyên

        const next = periodsToTime(sorted, oldRange.fromPeriod, oldRange.toPeriod);
        if (!next) return; // khung mới không có tiết đó — giữ nguyên

        if (next.startTime !== m.startTime || next.endTime !== m.endTime) {
          m.startTime = next.startTime;
          m.endTime = next.endTime;
          changed = true;
        }
      });

      if (changed) {
        await course.save();
        remapped += 1;
      }
    }
  }

  await User.updateOne({ _id: req.user._id }, { $set: { periodSchedule: sorted } });

  logger.info(`Đổi khung tiết cho ${req.user._id}, cập nhật ${remapped} môn`);

  res.status(200).json({
    status: 'success',
    message: remapped
      ? `Đã lưu khung tiết và cập nhật ${remapped} môn học`
      : 'Đã lưu khung tiết',
    data: { periods: sorted, remappedCourses: remapped },
  });
};

export const resetPeriods = async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { periodSchedule: [] } });
  const fresh = await User.findById(req.user._id).populate('university', 'periodSchedule');
  res.status(200).json({
    status: 'success',
    message: 'Đã khôi phục khung tiết mặc định',
    data: { periods: resolvePeriods(fresh) },
  });
};

export const setTimeDisplay = async (req, res) => {
  const mode = req.body.timeDisplay;
  if (!['period', 'clock'].includes(mode)) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: "Chỉ nhận 'period' hoặc 'clock'",
    });
  }

  await User.updateOne({ _id: req.user._id }, { $set: { 'preferences.timeDisplay': mode } });

  res.status(200).json({ status: 'success', data: { timeDisplay: mode } });
};

// ===== NHẬP TỪ CỔNG TRƯỜNG =====

/**
 * Bộ tách theo từng trường. Mỗi trường một hàm, chọn theo slug.
 * Thêm trường thứ hai chỉ là thêm một dòng ở đây.
 */
const PARSERS = { ueh: parseUEH };

/**
 * GET /api/schedule/import/support
 * Frontend hỏi trước: trường này có nhập nhanh được không?
 */
export const getImportSupport = async (req, res) => {
  const slug = req.user.university?.slug || null;
  const supported = Boolean(slug && PARSERS[slug]);

  res.status(200).json({
    status: 'success',
    data: {
      supported,
      slug,
      shortName: req.user.university?.shortName || null,
      source: supported ? 'https://daotao.ueh.edu.vn/khdt/' : null,
    },
  });
};

/**
 * POST /api/schedule/import/preview
 *
 * Chỉ tách và trả về, KHÔNG lưu. Sinh viên xem lại rồi mới xác nhận.
 * Bộ tách phụ thuộc vào cách trang trường trình bày dữ liệu, mà cách đó
 * có thể đổi bất cứ lúc nào — nên không bao giờ ghi thẳng vào thời khoá
 * biểu của người dùng mà không cho họ nhìn trước.
 */
export const previewImport = async (req, res) => {
  const slug = req.user.university?.slug;
  const parser = slug && PARSERS[slug];

  if (!parser) {
    return res.status(400).json({
      status: 'error',
      code: 'IMPORT_NOT_SUPPORTED',
      message: 'Chưa hỗ trợ nhập nhanh cho trường của bạn',
    });
  }

  const text = String(req.body.text || '');
  if (text.length > 200000) {
    return res.status(400).json({
      status: 'error',
      code: 'TEXT_TOO_LONG',
      message: 'Nội dung dán quá dài. Dán từng trang một.',
    });
  }

  const { courses, warnings } = parser(text);
  const periods = resolvePeriods(req.user);

  /** Gắn thêm số tiết để sinh viên đối chiếu với lịch trên cổng trường */
  const enriched = courses.map((c) => ({
    ...c,
    meetings: c.meetings.map((m) => ({
      ...m,
      periods: timeToPeriods(periods, m.startTime, m.endTime),
    })),
  }));

  // Cảnh báo trùng lịch ngay ở bước xem trước, không đợi lưu xong mới báo
  const flat = enriched.flatMap((c, ci) =>
    c.meetings.map((m) => ({ ...m, ci, name: c.courseName }))
  );
  const clashes = [];
  for (let i = 0; i < flat.length; i += 1) {
    for (let j = i + 1; j < flat.length; j += 1) {
      const a = flat[i];
      const b = flat[j];
      if (a.ci === b.ci || a.dayOfWeek !== b.dayOfWeek) continue;
      if (
        toMinutes(a.startTime) < toMinutes(b.endTime) &&
        toMinutes(b.startTime) < toMinutes(a.endTime)
      ) {
        clashes.push({ dayOfWeek: a.dayOfWeek, names: [a.name, b.name] });
      }
    }
  }

  res.status(200).json({
    status: 'success',
    data: { courses: enriched, warnings, clashes, periods },
  });
};

/**
 * POST /api/schedule/import
 * Nhận danh sách môn sinh viên đã xem và chỉnh, rồi lưu.
 */
export const commitImport = async (req, res) => {
  const incoming = Array.isArray(req.body.courses) ? req.body.courses : [];
  if (!incoming.length) {
    return res.status(400).json({
      status: 'error',
      code: 'NOTHING_TO_IMPORT',
      message: 'Không có môn nào để thêm',
    });
  }
  if (incoming.length > 20) {
    return res.status(400).json({
      status: 'error',
      code: 'TOO_MANY',
      message: 'Tối đa 20 môn mỗi lần nhập',
    });
  }

  const periods = resolvePeriods(req.user);
  const existing = await Schedule.find({ student: req.user._id, isArchived: false });

  const used = new Set(existing.map((c) => c.color).filter(Boolean));
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const item of incoming) {
    const { error, value } = courseInput.validate(
      {
        courseName: item.courseName,
        courseCode: item.courseCode || '',
        instructor: item.instructor || '',
        meetings: (item.meetings || []).map((m) => ({
          dayOfWeek: m.dayOfWeek,
          startTime: m.startTime,
          endTime: m.endTime,
          room: m.room || '',
          building: m.building || '',
          note: m.note || '',
        })),
      },
      { abortEarly: true }
    );

    if (error) {
      errors.push(`${item.courseName || 'Môn không tên'}: ${error.details[0].message}`);
      continue;
    }

    /**
     * Bỏ qua môn đã có. Sinh viên dán lại lần hai — vì thêm sót một môn,
     * hoặc vì trường đổi lịch — không nên tạo ra bản trùng.
     */
    const dup = existing.find(
      (c) =>
        (value.courseCode && c.courseCode === value.courseCode) ||
        c.courseName.toLowerCase() === value.courseName.toLowerCase()
    );
    if (dup) {
      skipped += 1;
      continue;
    }

    let meetings;
    try {
      meetings = normalizeMeetings(value.meetings, periods);
    } catch (e) {
      errors.push(`${value.courseName}: ${e.message}`);
      continue;
    }

    const color =
      COURSE_COLORS.find((c) => !used.has(c)) ||
      COURSE_COLORS[(existing.length + created) % COURSE_COLORS.length];
    used.add(color);

    await Schedule.create({
      ...value,
      meetings,
      color,
      student: req.user._id,
    });
    contributeToCatalog(req.user, { ...value, meetings });
    created += 1;
  }

  logger.info(`Nhập TKB: ${created} môn mới, ${skipped} bỏ qua, ${errors.length} lỗi`);

  res.status(201).json({
    status: 'success',
    message: skipped
      ? `Đã thêm ${created} môn, bỏ qua ${skipped} môn đã có`
      : `Đã thêm ${created} môn`,
    data: { created, skipped, errors },
  });
};

// ===== DANH MỤC LỚP HỌC PHẦN =====

/**
 * Ghi lớp học vào danh mục chung.
 *
 * Gọi mỗi khi sinh viên thêm môn — dù nhập tay hay dán từ cổng trường.
 * Không lưu ai đóng góp: danh mục chỉ chứa dữ liệu của nhà trường, không
 * chứa thông tin về người dùng.
 *
 * Bỏ qua lớp không có mã. Tên môn tự gõ thì mỗi người viết một kiểu
 * ("Kinh tế vi mô", "KTVM", "kinh te vi mo"), gom vào danh mục chỉ tạo
 * ra nhiễu. Mã lớp thì chép từ cổng trường nên đáng tin.
 */
const contributeToCatalog = async (user, course) => {
  const uniId = user.university?._id || user.university;
  const code = String(course.courseCode || '').trim().toUpperCase();

  if (!uniId || !code || code.length < 4) return;
  if (!course.meetings?.length) return;

  try {
    await CourseOffering.updateOne(
      { university: uniId, classCode: code },
      {
        $set: {
          courseName: course.courseName,
          instructor: course.instructor || '',
          term: course.term || '',
          academicYear: course.academicYear || '',
          meetings: course.meetings.map((m) => ({
            dayOfWeek: m.dayOfWeek,
            startTime: m.startTime,
            endTime: m.endTime,
            campus: m.campus || '',
            building: m.building || '',
            room: m.room || '',
          })),
          lastSeenAt: new Date(),
        },
        $inc: { seenCount: 1 },
        $setOnInsert: { university: uniId, classCode: code },
      },
      { upsert: true }
    );
  } catch (e) {
    // Danh mục là tiện ích phụ — hỏng thì không được kéo theo việc lưu môn
    logger.warn(`Không ghi được vào danh mục: ${e.message}`);
  }
};

/**
 * GET /api/schedule/courses/search?q=
 *
 * Gợi ý lớp học phần cho ô nhập. Tìm được cả bằng mã lớp lẫn tên môn —
 * sinh viên nhớ cái nào thì gõ cái đó.
 */
export const searchCourses = async (req, res) => {
  const uniId = req.user.university?._id || req.user.university;
  const q = String(req.query.q || '').trim();

  if (!uniId) {
    return res.status(200).json({ status: 'success', data: { courses: [], reason: 'NO_UNIVERSITY' } });
  }
  if (q.length < 2) {
    return res.status(200).json({ status: 'success', data: { courses: [] } });
  }

  const filter = { university: uniId };
  const upper = q.toUpperCase();

  /**
   * Gõ mã thì khớp theo tiền tố — sinh viên gõ "26D1TEC" là ra hết các
   * lớp của môn đó. Gõ tên thì dùng tìm kiếm toàn văn.
   *
   * escape ký tự đặc biệt: mã lớp không có, nhưng tên môn thì có dấu
   * chấm ("A.I. trong kinh doanh") và dấu ngoặc.
   */
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isCodeLike = /^[A-Z0-9]{2,}$/i.test(q);

  const query = isCodeLike
    ? { ...filter, classCode: new RegExp(`^${safe.toUpperCase()}`) }
    : { ...filter, $or: [
        { courseName: new RegExp(safe, 'i') },
        { classCode: new RegExp(`^${safe.toUpperCase()}`) },
      ] };

  const list = await CourseOffering.find(query)
    .sort({ seenCount: -1, lastSeenAt: -1 })
    .limit(15)
    .lean();

  const periods = resolvePeriods(req.user);
  const campuses = req.user.university?.campuses || [];
  const campusName = (code) => campuses.find((c) => c.code === code)?.name || code || '';

  res.status(200).json({
    status: 'success',
    data: {
      courses: list.map((o) => ({
        id: String(o._id),
        classCode: o.classCode,
        courseName: o.courseName,
        instructor: o.instructor,
        seenCount: o.seenCount,
        /** Đủ tin cậy khi ít nhất ba người có cùng lớp này trong lịch */
        trusted: o.seenCount >= 3,
        meetings: (o.meetings || []).map((m) => ({
          ...m,
          campusName: campusName(m.campus),
          periods: timeToPeriods(periods, m.startTime, m.endTime),
        })),
      })),
    },
  });
};
