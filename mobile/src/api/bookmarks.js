import client from './client';

export const fetchCollections = () =>
  client.get('/bookmarks/collections').then((r) => r.data.data.collections);

export const createCollection = (name, emoji = '') =>
  client.post('/bookmarks/collections', { name, emoji }).then((r) => r.data.data.collection);

export const renameCollection = (id, name, emoji = '') =>
  client.put(`/bookmarks/collections/${id}`, { name, emoji }).then((r) => r.data.data.collection);

export const deleteCollection = (id) =>
  client.delete(`/bookmarks/collections/${id}`).then((r) => r.data);

export const savePost = (postId, collectionId = null, note = '') =>
  client.post('/bookmarks', { postId, collectionId, note }).then((r) => r.data);

export const unsavePost = (postId) =>
  client.delete(`/bookmarks/${postId}`).then((r) => r.data);

export const fetchSaved = ({ collection, page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  if (collection) params.collection = collection;
  return client.get('/bookmarks', { params }).then((r) => r.data.data);
};

/** Vài biểu tượng gợi ý khi đặt tên bộ sưu tập mới */
export const EMOJI_CHOICES = ['🔖', '📚', '🏠', '💡', '🍜', '💰', '📝', '🎯', '⭐️', '🧠'];
