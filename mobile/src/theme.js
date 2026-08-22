/**
 * Hệ thống thiết kế Cantea.
 * Mọi màu và khoảng cách trong app lấy từ đây, không hardcode rải rác.
 */

export const colors = {
  // ===== THƯƠNG HIỆU =====
  brand: '#6366F1', // Indigo — nút chính, nhấn mạnh
  brandDeep: '#4338CA', // Deep Indigo — trạng thái nhấn, chữ quan trọng
  brandSoft: '#EEF2FF', // Light Indigo — nền thẻ, mục đang chọn

  // ===== ĐIỂM NHẤN =====
  accent: '#FDE68A', // Butter Yellow — dùng làm NỀN, không dùng làm chữ
  accentInk: '#92400E', // chữ đặt trên nền butter yellow

  // ===== NỀN =====
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  // ===== CHỮ =====
  ink: '#1E1B4B', // tím than, mềm hơn đen tuyền
  inkMuted: '#64748B',
  inkFaint: '#94A3B8',

  // ===== TRẠNG THÁI =====
  // Mỗi trạng thái có 3 sắc độ: nền nhạt, màu chủ đạo, và màu chữ đủ đậm.
  // #34D399 rất đẹp khi làm nền hoặc icon, nhưng đặt làm chữ thì mờ,
  // nên có successInk riêng cho phần chữ.
  success: '#34D399',
  successSoft: '#D1FAE5',
  successInk: '#047857',

  warning: '#FDE68A',
  warningSoft: '#FEF3C7',
  warningInk: '#92400E',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  dangerInk: '#B91C1C',

  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const type = {
  wordmark: { fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.6 },
  heading: { fontSize: 19, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
};
