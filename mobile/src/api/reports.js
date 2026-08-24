import client from './client';

/**
 * Lấy danh sách lý do từ server thay vì chép cứng trong app.
 *
 * Enum nằm ở backend; chép sang đây là tạo bản thứ hai, và bản thứ hai sẽ lệch
 * đúng vào lúc ai đó thêm một lý do mới mà quên sửa cả hai chỗ.
 */
export const fetchReasons = () =>
  client.get('/reports/reasons').then((r) => r.data.data.reasons);

export const reportPost = (postId, reason, detail = '') =>
  client.post(`/reports/posts/${postId}`, { reason, detail }).then((r) => r.data);

/** Hàng chờ kiểm duyệt — chỉ tài khoản moderator gọi được */
export const fetchReports = (status = 'pending', page = 1) =>
  client.get('/reports', { params: { status, page, limit: 20 } }).then((r) => r.data.data);

/** action: 'dismiss' | 'hide' | 'delete' */
export const resolveReports = (postId, action) =>
  client.patch(`/reports/posts/${postId}`, { action }).then((r) => r.data);
