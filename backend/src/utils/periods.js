/**
 * KHUNG TIẾT HỌC
 *
 * Nguyên tắc: GIỜ là nguồn sự thật duy nhất, lưu trong database.
 * Tiết được suy ra từ giờ khi hiển thị.
 *
 * Lý do: giờ là giá trị tuyệt đối — dùng được cho thông báo nhắc lịch,
 * sắp xếp, phát hiện trùng lịch. Còn tiết thì phụ thuộc khung của
 * từng trường, và khung đó có thể thay đổi.
 *
 * Nếu lưu cả hai, chúng sẽ lệch nhau và không biết tin cái nào.
 */

/** Khung 15 tiết, mỗi tiết 50 phút. Dùng khi chưa có khung riêng. */
export const DEFAULT_PERIODS = [
  { period: 1, start: '07:00', end: '07:50', session: 'morning' },
  { period: 2, start: '07:50', end: '08:40', session: 'morning' },
  { period: 3, start: '08:40', end: '09:30', session: 'morning' },
  { period: 4, start: '09:40', end: '10:30', session: 'morning' },
  { period: 5, start: '10:30', end: '11:20', session: 'morning' },

  { period: 6, start: '13:00', end: '13:50', session: 'afternoon' },
  { period: 7, start: '13:50', end: '14:40', session: 'afternoon' },
  { period: 8, start: '14:40', end: '15:30', session: 'afternoon' },
  { period: 9, start: '15:40', end: '16:30', session: 'afternoon' },
  { period: 10, start: '16:30', end: '17:20', session: 'afternoon' },

  { period: 11, start: '18:00', end: '18:50', session: 'evening' },
  { period: 12, start: '18:50', end: '19:40', session: 'evening' },
  { period: 13, start: '19:40', end: '20:30', session: 'evening' },
  { period: 14, start: '20:40', end: '21:30', session: 'evening' },
  { period: 15, start: '21:30', end: '22:20', session: 'evening' },
];

/**
 * Thứ tự ưu tiên khung tiết:
 *   1. Khung cá nhân người dùng tự chỉnh
 *   2. Khung của trường (khi đã xác thực)
 *   3. Khung mặc định
 */
export const resolvePeriods = (user) => {
  if (user?.periodSchedule?.length) return user.periodSchedule;
  if (user?.university?.periodSchedule?.length) return user.university.periodSchedule;
  return DEFAULT_PERIODS;
};

/** "07:30" → 450 (số phút từ nửa đêm) */
export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

export const isValidTime = (hhmm) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(hhmm));

/** Chuyển khoảng tiết thành khoảng giờ. Trả null nếu tiết không tồn tại. */
export const periodsToTime = (periods, fromPeriod, toPeriod) => {
  const from = periods.find((p) => p.period === Number(fromPeriod));
  const to = periods.find((p) => p.period === Number(toPeriod));
  if (!from || !to) return null;
  if (toMinutes(to.end) <= toMinutes(from.start)) return null;
  return { startTime: from.start, endTime: to.end };
};

/**
 * Suy ngược từ giờ ra tiết.
 * Trả null nếu buổi học không khớp khung tiết nào — ví dụ lịch bù,
 * học ngoài giờ. Khi đó giao diện hiển thị thẳng giờ, không ép vào
 * một tiết sai.
 */
export const timeToPeriods = (periods, startTime, endTime) => {
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);

  const from = periods.find((p) => toMinutes(p.start) === s);
  const to = periods.find((p) => toMinutes(p.end) === e);

  if (!from || !to || from.period > to.period) return null;
  return { fromPeriod: from.period, toPeriod: to.period };
};

/** Nhãn tiếng Việt cho thứ. Quy ước Việt Nam: 2 = Thứ Hai, 8 = Chủ nhật. */
export const DAY_LABELS = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

/** Date.getDay() (0=CN) → quy ước Việt Nam (8=CN) */
export const jsDayToVn = (jsDay) => (jsDay === 0 ? 8 : jsDay + 1);
