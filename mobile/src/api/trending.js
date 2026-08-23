import client from './client';

/**
 * @param scope  'global' | 'university'
 * @param window '6h' | '24h' | '7d'
 */
export const fetchTrending = (scope = 'global', window = '6h') =>
  client.get('/trending', { params: { scope, window } }).then((r) => r.data.data);

/**
 * Bài của mình có đang nổi không, và có lan bất thường không.
 * Gọi khi mở tab Cộng đồng.
 */
export const fetchMyAlerts = () => client.get('/trending/mine').then((r) => r.data.data.alerts);

export const toggleExclude = (postId, excluded) =>
  client.post(`/trending/exclude/${postId}`, { excluded }).then((r) => r.data);

export const WINDOWS = [
  { value: '6h', label: '6 giờ' },
  { value: '24h', label: '24 giờ' },
  { value: '7d', label: 'Tuần này' },
];

/** "9:40" — mốc bảng được tính lần gần nhất */
export const clockOf = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

/** Nhãn cho mũi tên lên xuống hạng */
export const deltaLabel = (delta) => {
  if (!delta) return null;
  if (delta.kind === 'new') return { text: 'MỚI', kind: 'new' };
  if (delta.kind === 'same') return null;
  return {
    text: `${delta.kind === 'up' ? '▲' : '▼'} ${delta.value}`,
    kind: delta.kind,
  };
};
