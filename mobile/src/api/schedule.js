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

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/**
 * Nhãn thời gian của một buổi học.
 * Buổi nào không khớp khung tiết (lịch bù, học ngoài giờ) thì
 * hiện thẳng giờ, không ép vào một tiết sai.
 */
export const meetingLabel = (meeting, mode) => {
  if (mode === 'period' && meeting.periods) {
    const { fromPeriod, toPeriod } = meeting.periods;
    return fromPeriod === toPeriod ? `Tiết ${fromPeriod}` : `Tiết ${fromPeriod}–${toPeriod}`;
  }
  return `${meeting.startTime}–${meeting.endTime}`;
};
