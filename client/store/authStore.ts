import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      let customError = error?.message || 'Login failed';
      if (customError === 'missing email or phone') {
        customError = 'Please enter your credentials';
      }
      if (error || !data.session) {
        set({ error: customError, loading: false });
        return;
      }
      set({
        user: { id: data.user.id, email: data.user.email ?? '' },
        token: data.session.access_token,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({ error: e.message || 'Login failed', loading: false });
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, token: null });
  },
  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: name ? { data: { name } } : undefined,
      });
      let customError = error?.message || 'Registration failed';
      if (customError === 'missing email or phone') {
        customError = 'Please enter your email and password.';
      }
      if (customError === 'Anonymous sign-ins are disabled') {
        customError = 'All fields are required';
      }
      if (error || !data.user) {
        set({ error: customError, loading: false });
        return;
      }
      // Insert into public profiles table
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        username: name,
      });
      set({
        user: { id: data.user.id, email: data.user.email ?? '', name },
        token: data.session?.access_token ?? null,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({ error: e.message || 'Registration failed', loading: false });
    }
  },
}));
