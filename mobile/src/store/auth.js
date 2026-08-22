import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import client, { setAuthToken } from '../api/client';

const TOKEN_KEY = 'cantea.token';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // 'loading' cho tới khi biết chắc người dùng đã đăng nhập hay chưa
  const [booting, setBooting] = useState(true);

  /** Khôi phục phiên đăng nhập khi mở app */
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!saved) return;

        setAuthToken(saved);
        const { data } = await client.get('/auth/me');
        setToken(saved);
        setUser(data.data.user);
      } catch {
        // Token hỏng hoặc hết hạn — xoá đi, coi như chưa đăng nhập
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextToken, nextUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await client.post('/auth/login', { email, password });
      await persist(data.data.token, data.data.user);
      return data.data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await client.post('/auth/register', payload);
      await persist(data.data.token, data.data.user);
      return data.data.user;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // Đăng xuất không được phép thất bại vì lỗi mạng
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  /** Nạp lại thông tin người dùng, dùng sau khi xác thực trường xong */
  const refresh = useCallback(async () => {
    const { data } = await client.get('/auth/me');
    setUser(data.data.user);
    return data.data.user;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        booting,
        isSignedIn: Boolean(token),
        isVerified: user?.verificationStatus === 'verified',
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
};
