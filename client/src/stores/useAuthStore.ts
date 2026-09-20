import { create } from 'zustand';
import { User } from '../types';
import { apiRequest } from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  guestLogin: (name?: string) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('inkspace_token'),
  isAuthenticated: false,
  isLoading: true,

  initAuth: async () => {
    const token = localStorage.getItem('inkspace_token');
    if (!token) {
      // Create guest session automatically so the user can immediately use everything
      try {
        const res = await apiRequest('/auth/guest', {
          method: 'POST',
          body: JSON.stringify({ name: `Guest_${Math.floor(1000 + Math.random() * 9000)}` }),
        });
        localStorage.setItem('inkspace_token', res.token);
        set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
      } catch (e) {
        console.error('Failed to init guest auth:', e);
        set({ isLoading: false });
      }
      return;
    }

    try {
      const res = await apiRequest('/auth/me');
      set({ user: res.user, token, isAuthenticated: true, isLoading: false });
    } catch {
      // Invalid or expired token -> initialize guest session
      localStorage.removeItem('inkspace_token');
      try {
        const res = await apiRequest('/auth/guest', {
          method: 'POST',
          body: JSON.stringify({ name: `Guest_${Math.floor(1000 + Math.random() * 9000)}` }),
        });
        localStorage.setItem('inkspace_token', res.token);
        set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  login: async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('inkspace_token', res.token);
    set({ user: res.user, token: res.token, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  guestLogin: async (name) => {
    const res = await apiRequest('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ name: name || `Guest_${Math.floor(1000 + Math.random() * 9000)}` }),
    });
    localStorage.setItem('inkspace_token', res.token);
    set({ user: res.user, token: res.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('inkspace_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
