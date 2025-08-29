import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await new Promise((res) => setTimeout(res, 1000));
      set({ isAuthenticated: true, user: { id: '1', email }, token: 'fake-token', loading: false });
    } catch (e) {
      set({ error: 'Login failed', loading: false });
    }
  },
  logout: () => set({ isAuthenticated: false, user: null, token: null }),
  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      await new Promise((res) => setTimeout(res, 1000));
      set({ isAuthenticated: true, user: { id: '2', email, name }, token: 'fake-token', loading: false });
    } catch (e) {
      set({ error: 'Registration failed', loading: false });
    }
  },
}));
