import client from './client';

export const fetchListings = (params = {}) =>
  client.get('/listings', { params }).then((r) => r.data.data);

export const fetchMyListings = () => client.get('/listings/mine').then((r) => r.data.data);

export const fetchSavedListings = () => client.get('/listings/saved').then((r) => r.data.data);

export const fetchListing = (id) => client.get(`/listings/${id}`).then((r) => r.data.data);

export const createListing = (payload) =>
  client.post('/listings', payload).then((r) => r.data.data.listing);

export const updateListing = (id, payload) =>
  client.put(`/listings/${id}`, payload).then((r) => r.data.data.listing);

export const setListingStatus = (id, status) =>
  client.patch(`/listings/${id}/status`, { status }).then((r) => r.data);

export const bumpListing = (id) => client.post(`/listings/${id}/bump`).then((r) => r.data);

export const deleteListing = (id) => client.delete(`/listings/${id}`).then((r) => r.data);

export const toggleSaveListing = (id) =>
  client.post(`/listings/${id}/save`).then((r) => r.data.data);

// ===== NHÃN =====

export const CATEGORIES = [
  { value: null, label: 'Tất cả' },
  { value: 'material', label: 'Tài liệu học' },
  { value: 'book', label: 'Sách' },
  { value: 'supplies', label: 'Đồ dùng' },
  { value: 'other', label: 'Khác' },
];

/** Giá trị cũ từ trước khi gộp — vẫn hiện đúng nhãn thay vì "Khác" */
const LEGACY = { textbook: 'Tài liệu học', notes: 'Tài liệu học' };

export const DEAL_TYPES = [
  { value: 'sell', label: 'Bán' },
  { value: 'give', label: 'Tặng' },
  { value: 'exchange', label: 'Trao đổi' },
];

export const CONDITIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'like_new', label: 'Như mới' },
  { value: 'good', label: 'Còn tốt' },
  { value: 'fair', label: 'Đã dùng nhiều' },
];

export const conditionLabel = (v) => CONDITIONS.find((c) => c.value === v)?.label || '';
export const categoryLabel = (v) =>
  CATEGORIES.find((c) => c.value === v)?.label || LEGACY[v] || 'Khác';

/** 45000 → "45.000đ" — dấu chấm ngăn nghìn theo cách viết Việt Nam */
export const formatPrice = (n) => {
  if (!n || n <= 0) return 'Miễn phí';
  return `${Number(n).toLocaleString('vi-VN')}đ`;
};

/** Nhãn hiển thị theo hình thức giao dịch */
export const dealLabel = (listing) => {
  if (listing.dealType === 'give') return 'Miễn phí';
  if (listing.dealType === 'exchange') return 'Trao đổi';
  return formatPrice(listing.price);
};

/** "biệt danh · Ngành · Năm 2" — cho biết món đồ này từ đâu ra */
export const sellerLine = (seller) => {
  if (!seller) return '';
  return [seller.displayName, seller.major, seller.year ? `Năm ${seller.year}` : null]
    .filter(Boolean)
    .join(' · ');
};

export const STATUS_LABEL = {
  active: null,
  reserved: 'ĐANG GIỮ',
  sold: 'ĐÃ BÁN',
  hidden: 'ĐÃ ẨN',
};
