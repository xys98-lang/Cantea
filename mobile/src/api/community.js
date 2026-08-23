import client from './client';

export const fetchFeed = ({
  scope = 'university',
  sort = 'hot',
  category,
  topic,
  page = 1,
  limit = 20,
} = {}) => {
  const params = { scope, sort, page, limit };
  if (category) params.category = category;
  if (topic) params.topic = topic;
  return client.get('/community/feed', { params }).then((r) => r.data.data);
};

/** Chủ đề theo mùa đang hiển thị */
export const fetchTopics = (scope = 'global') =>
  client.get('/community/topics', { params: { scope } }).then((r) => r.data.data);

export const fetchPost = (id) =>
  client.get(`/community/posts/${id}`).then((r) => r.data.data.post);

export const createPost = (payload) =>
  client.post('/community/posts', payload).then((r) => r.data.data.post);

export const deletePost = (id) => client.delete(`/community/posts/${id}`).then((r) => r.data);

export const togglePostLike = (id) =>
  client.post(`/community/posts/${id}/like`).then((r) => r.data.data);

export const fetchComments = (id, page = 1) =>
  client.get(`/community/posts/${id}/comments`, { params: { page, limit: 30 } })
    .then((r) => r.data.data);

export const createComment = (id, payload) =>
  client.post(`/community/posts/${id}/comments`, payload).then((r) => r.data.data.comment);

export const deleteComment = (id) =>
  client.delete(`/community/comments/${id}`).then((r) => r.data);

export const toggleCommentLike = (id) =>
  client.post(`/community/comments/${id}/like`).then((r) => r.data.data);

/** Chuyên mục — giá trị khớp enum của backend, nhãn hiển thị tiếng Việt */
/**
 * Năm chuyên mục theo bản thiết kế v4.0. Bốn mục có màu riêng, "Chung"
 * dùng viền xám như cũ — nó là mục mặc định nên không cần nổi bật.
 */
export const CATEGORIES = [
  { value: 'General', label: 'Chung' },
  { value: 'Academics', label: 'Học tập' },
  { value: 'Housing', label: 'Ký túc xá' },
  { value: 'CampusLife', label: 'Chuyện trường' },
  { value: 'Jobs', label: 'Việc làm' },
];

/** Nhãn cho các mục đã bỏ — bài cũ chưa chuyển vẫn hiện đúng tên */
const LEGACY_LABEL = {
  'Student Life': 'Chuyện trường',
  Events: 'Chuyện trường',
  'Q&A': 'Học tập',
  'Book Exchange': 'Chung',
  'Study Group': 'Học tập',
};

export const categoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || LEGACY_LABEL[value] || value;

/** "12 phút trước", "3 giờ trước", "5 ngày trước" */
export const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;

  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};
