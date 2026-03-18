import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken]     = useState(localStorage.getItem('safeher_token'));

  // Restore session on mount — always fetch fresh from DB
  useEffect(() => {
    const restore = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await getMe();
        setUser({ ...data.user });
        console.log('✅ Session restored, role:', data.user?.role);
      } catch {
        localStorage.removeItem('safeher_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [token]);

  const login = async (credentials) => {
    const { data } = await loginUser(credentials);
    localStorage.setItem('safeher_token', data.token);
    setToken(data.token);
    // Always fetch fresh user from DB to get latest role
    try {
      const meRes = await getMe();
      console.log('✅ Logged in, role:', meRes.data.user?.role);
      setUser({ ...meRes.data.user });
    } catch {
      setUser({ ...data.user });
    }
    return data;
  };

  const register = async (userData) => {
    const { data } = await registerUser(userData);
    localStorage.setItem('safeher_token', data.token);
    localStorage.setItem('safeher_is_new_user', 'true'); // flag for onboarding
    setToken(data.token);
    try {
      const meRes = await getMe();
      setUser({ ...meRes.data.user });
    } catch {
      setUser({ ...data.user });
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('safeher_token');
    setToken(null);
    setUser(null);
  };

  // Force fresh fetch from DB — picks up any role changes made in MongoDB
  const refreshUser = async () => {
    try {
      const { data } = await getMe();
      console.log('🔄 Refreshed, role:', data.user?.role);
      setUser({ ...data.user });
      return data.user;
    } catch (err) {
      console.error('Failed to refresh user:', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};