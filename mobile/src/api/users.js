import client from './client';

export const updateProfile = (payload) =>
  client.patch('/users/me', payload).then((r) => r.data.data.user);

export const changePassword = (currentPassword, newPassword) =>
  client.patch('/users/me/password', { currentPassword, newPassword }).then((r) => r.data.data);

export const updateNotifications = (payload) =>
  client.patch('/users/me/notifications', payload).then((r) => r.data.data.notifications);

export const updatePrivacy = (payload) =>
  client.patch('/users/me/privacy', payload).then((r) => r.data.data.privacy);

/**
 * Năm học là danh sách chọn chứ không phải ô nhập tự do: backend chỉ nhận 1–6,
 * và gõ tay thì người dùng chỉ biết mình sai sau khi bấm lưu.
 */
export const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6];
