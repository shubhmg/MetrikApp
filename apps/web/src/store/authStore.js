import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  currentBusinessId: localStorage.getItem('currentBusinessId') || null,

  setAuth: (user, accessToken, refreshToken) => {
    const existingBusinessId = localStorage.getItem('currentBusinessId');
    let nextBusinessId = existingBusinessId;
    const businessIds = (user?.businesses || []).map((b) => String(b.businessId));
    if (!nextBusinessId || !businessIds.includes(String(nextBusinessId))) {
      nextBusinessId = businessIds[0] || null;
    }
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (nextBusinessId) {
      localStorage.setItem('currentBusinessId', nextBusinessId);
    } else {
      localStorage.removeItem('currentBusinessId');
    }
    set({ user, accessToken, refreshToken, currentBusinessId: nextBusinessId });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  setCurrentBusiness: (businessId) => {
    localStorage.setItem('currentBusinessId', businessId);
    set({ currentBusinessId: businessId });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentBusinessId');
    set({ user: null, accessToken: null, refreshToken: null, currentBusinessId: null });
  },
}));
