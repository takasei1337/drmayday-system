import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('drmayday_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('drmayday_token'));
  const [loading, setLoading] = useState(false);

  const login = async (soDienThoai, matKhau) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        phone: soDienThoai,
        password: matKhau,
      });

      if ((res.success || res.code === 1000) && res.data) {
        const { access_token, user_info } = res.data;
        const finalToken = access_token || res.data.token;
        const finalUser = user_info || res.data.user;

        localStorage.setItem('drmayday_token', finalToken);
        localStorage.setItem('drmayday_user', JSON.stringify(finalUser));
        setToken(finalToken);
        setUser(finalUser);
        return { success: true, user: finalUser };
      } else {
        return { success: false, message: res.message || 'Đăng nhập không thành công' };
      }
    } catch (err) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // bỏ qua lỗi nếu token đã hết hạn
    } finally {
      localStorage.removeItem('drmayday_token');
      localStorage.removeItem('drmayday_user');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
