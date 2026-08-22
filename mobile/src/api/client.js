import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Điện thoại thật không gọi được 'localhost' của máy Mac.
 * Expo đã biết IP nội bộ của máy chủ dev (chính là địa chỉ trong mã QR),
 * nên ta lấy lại từ đó thay vì bắt người dùng gõ tay.
 * Đổi wifi hay đổi IP cũng không phải sửa code.
 */
const resolveBaseUrl = () => {
  // Ưu tiên biến môi trường nếu có (dùng khi deploy thật)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL = resolveBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Token được nạp vào đây bởi store/auth.js
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/**
 * Chuẩn hoá mọi lỗi về một hình dạng: { code, message, status }
 * Màn hình không cần biết lỗi đến từ mạng hay từ server.
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const data = error.response.data || {};
      return Promise.reject({
        code: data.code || 'SERVER_ERROR',
        message: data.message || 'Có lỗi xảy ra, vui lòng thử lại',
        status: error.response.status,
      });
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        code: 'TIMEOUT',
        message: 'Máy chủ phản hồi quá lâu. Kiểm tra kết nối rồi thử lại.',
      });
    }

    return Promise.reject({
      code: 'NETWORK_ERROR',
      message: `Không kết nối được tới máy chủ (${API_BASE_URL}). Kiểm tra backend đã chạy chưa và điện thoại có cùng wifi với máy tính không.`,
    });
  }
);

export default client;
