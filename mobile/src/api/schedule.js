import client from './client';

export const fetchSchedule = () => client.get('/schedule').then((r) => r.data.data);

export const fetchToday = () => client.get('/schedule/today').then((r) => r.data.data);

export const createCourse = (payload) =>
  client.post('/schedule', payload).then((r) => r.data.data);

export const updateCourse = (id, payload) =>
  client.put(`/schedule/${id}`, payload).then((r) => r.data.data);

export const deleteCourse = (id) => client.delete(`/schedule/${id}`).then((r) => r.data);

export const setTimeDisplay = (timeDisplay) =>
  client.put('/schedule/display', { timeDisplay }).then((r) => r.data.data);

/**
 * Gợi ý lớp học phần theo mã hoặc tên môn.
 * Danh mục được gom từ chính lịch sinh viên đã nhập — trường mới chưa
 * có ai nhập thì trả về rỗng, và sinh viên gõ tay như bình thường.
 */
export const searchCourses = (q) =>
  client.get('/schedule/courses/search', { params: { q } }).then((r) => r.data.data.courses);

// ===== KHUNG TIẾT =====

export const fetchPeriods = () => client.get('/schedule/periods').then((r) => r.data.data);

export const savePeriods = (periods, remapCourses = false) =>
  client.put('/schedule/periods', { periods, remapCourses }).then((r) => r.data);

export const resetPeriods = () => client.delete('/schedule/periods').then((r) => r.data.data);

/** Quy ước Việt Nam: 2 = Thứ Hai ... 8 = Chủ nhật */
export const DAYS = [
  { value: 2, short: 'T2', label: 'Thứ 2' },
  { value: 3, short: 'T3', label: 'Thứ 3' },
  { value: 4, short: 'T4', label: 'Thứ 4' },
  { value: 5, short: 'T5', label: 'Thứ 5' },
  { value: 6, short: 'T6', label: 'Thứ 6' },
  { value: 7, short: 'T7', label: 'Thứ 7' },
  { value: 8, short: 'CN', label: 'Chủ nhật' },
];

export const SESSIONS = [
  { key: 'morning', label: 'Ca sáng' },
  { key: 'afternoon', label: 'Ca chiều' },
  { key: 'evening', label: 'Ca tối' },
];

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const fromMinutes = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const isValidTime = (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(v));

/**
 * Tạo cả khung tiết từ vài thông số — đây là phần "chỉnh nhanh cả bảng".
 * Sinh viên chỉ cần biết ca sáng bắt đầu mấy giờ, mỗi tiết bao nhiêu phút,
 * nghỉ giải lao sau tiết thứ mấy. Không phải gõ 15 cặp giờ.
 */
export const buildPeriods = (sessions) => {
  const out = [];
  let n = 1;

  sessions.forEach((s) => {
    if (!s.enabled || !s.count) return;
    let cursor = toMinutes(s.start);

    for (let i = 0; i < s.count; i += 1) {
      const end = cursor + s.duration;
      out.push({ period: n, start: fromMinutes(cursor), end: fromMinutes(end), session: s.key });
      n += 1;
      cursor = end;
      // Nghỉ giải lao chèn vào sau tiết thứ breakAfter của ca này
      if (s.breakAfter && i + 1 === s.breakAfter) cursor += s.breakMinutes || 0;
    }
  });

  return out;
};

/** Suy ngược thông số từ một khung có sẵn, để mở màn hình chỉnh nhanh không bị trống */
export const inferSessions = (periods) => {
  const base = { morning: '07:00', afternoon: '13:00', evening: '18:00' };

  return SESSIONS.map((s) => {
    const list = (periods || []).filter((p) => p.session === s.key);
    if (!list.length) {
      return {
        key: s.key,
        label: s.label,
        enabled: false,
        start: base[s.key],
        count: 5,
        duration: 50,
        breakAfter: 3,
        breakMinutes: 10,
      };
    }

    const duration = toMinutes(list[0].end) - toMinutes(list[0].start);

    // Tìm chỗ có khoảng hở giữa hai tiết liên tiếp — đó là giờ nghỉ
    let breakAfter = 0;
    let breakMinutes = 0;
    for (let i = 0; i < list.length - 1; i += 1) {
      const gap = toMinutes(list[i + 1].start) - toMinutes(list[i].end);
      if (gap > 0) {
        breakAfter = i + 1;
        breakMinutes = gap;
        break;
      }
    }

    return {
      key: s.key,
      label: s.label,
      enabled: true,
      start: list[0].start,
      count: list.length,
      duration,
      breakAfter,
      breakMinutes,
    };
  });
};

export const meetingLabel = (meeting, mode) => {
  if (mode === 'period' && meeting.periods) {
    const { fromPeriod, toPeriod } = meeting.periods;
    return fromPeriod === toPeriod ? `Tiết ${fromPeriod}` : `Tiết ${fromPeriod}–${toPeriod}`;
  }
  return `${meeting.startTime}–${meeting.endTime}`;
};

/** "B201 · Toà A" — bỏ qua phần trống */
export const placeLabel = (meeting) =>
  [meeting.room, meeting.building].filter(Boolean).join(' · ');
