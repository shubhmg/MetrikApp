import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import api from '../services/api.js';

export function useAuth() {
  const { user, accessToken, currentBusinessId, setAuth, logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
    return data.data;
  }, [setAuth]);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
    return data.data;
  }, [setAuth]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore
    }
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  return {
    user,
    isAuthenticated: !!accessToken,
    currentBusinessId,
    login,
    register,
    logout,
  };
}
