import client from './client';

export const fetchConversations = () => client.get('/messages').then((r) => r.data.data);

export const fetchUnread = () => client.get('/messages/unread').then((r) => r.data.data);

export const fetchMessages = (id, before) =>
  client.get(`/messages/${id}`, { params: before ? { before } : {} }).then((r) => r.data.data);

/**
 * Mở hội thoại cho một tin đăng. Gọi lại lần hai trả về đúng hội thoại cũ.
 * @param anonymous  người mua nhắn ẩn danh (mặc định bật)
 */
/**
 * Mở hội thoại cho một tin đăng hoặc một bài viết.
 * @param contextType 'listing' | 'post'
 */
export const startConversation = (contextType, contextId, text = '', opts = {}) =>
  client
    .post('/messages', {
      contextType,
      contextId,
      text,
      anonymous: opts.anonymous !== false,
      confirmContact: Boolean(opts.confirmContact),
    })
    .then((r) => r.data.data.conversation);

export const sendMessage = (id, { text = '', images = [], confirmContact = false } = {}) =>
  client
    .post(`/messages/${id}`, { text, images, confirmContact })
    .then((r) => r.data.data.message);

export const revealIdentity = (id) => client.post(`/messages/${id}/reveal`).then((r) => r.data);

export const blockConversation = (id) => client.post(`/messages/${id}/block`).then((r) => r.data);

export const archiveConversation = (id) =>
  client.post(`/messages/${id}/archive`).then((r) => r.data);

export const reportConversation = (id, reason) =>
  client.post(`/messages/${id}/report`, { reason }).then((r) => r.data);

/**
 * Ba câu này xử lý gần hết tin nhắn đầu tiên trong một cái chợ sách.
 * Bấm một lần là xong, đỡ phải nghĩ cách mở lời với người lạ.
 */
export const QUICK_REPLIES = {
  listing: [
    'Sách còn không bạn?',
    'Mình lấy nhé, hẹn gặp ở đâu được?',
    'Giảm chút được không bạn?',
  ],
  post: [
    'Mình hỏi thêm về bài của bạn được không?',
    'Bạn cho mình xin thêm thông tin với',
    'Cảm ơn bài viết của bạn',
  ],
};

export const timeShort = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const clockTime = (iso) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
