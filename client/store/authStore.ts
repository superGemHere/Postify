import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name?: string, avatarUri?: string) => Promise<void>;
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
  register: async (email, password, name, avatarUri) => {
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
      
      let avatarUrl = null;
      
      // Upload avatar if provided
      if (avatarUri) {
        try {
          console.log('Starting avatar upload for user:', data.user.id);
          const fileExt = avatarUri.split('.').pop() || 'jpg'; // Fallback to jpg
          const fileName = `${data.user.id}/avatar.${fileExt}`;
          const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          
          console.log('Avatar file details:', { fileName, contentType, originalUri: avatarUri });
          
          // Read file as base64
          const fileData = await FileSystem.readAsStringAsync(avatarUri, { 
            encoding: FileSystem.EncodingType.Base64 
          });
          const fileBuffer = decode(fileData);

          console.log('File read successfully, uploading to storage...');

          // Upload to Supabase Storage (avatars bucket)
          const { data: storageData, error: storageError } = await supabase.storage
            .from('avatars')
            .upload(fileName, fileBuffer, { contentType });
            
          if (storageError) {
            console.error('Storage upload error:', storageError);
            throw storageError;
          }

          console.log('Storage upload successful:', storageData);

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrlData.publicUrl;
          
          console.log('Avatar URL generated:', avatarUrl);
        } catch (avatarError) {
          // Continue with registration even if avatar upload fails
          console.error('Avatar upload failed:', avatarError);
        }
      } else {
        console.log('No avatar URI provided');
      }
      
      // Insert into public profiles table
      console.log('Inserting profile with data:', {
        id: data.user.id,
        email: data.user.email ?? email,
        username: name,
        avatar_url: avatarUrl,
      });
      
      const { data: profileData, error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        username: name,
        avatar_url: avatarUrl,
      }).select();
      
      if (profileError) {
        console.error('Profile insertion error:', profileError);
        throw profileError;
      }
      
      console.log('Profile inserted successfully:', profileData);
      
      set({
        user: null,
        token: null,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({ error: e.message || 'Registration failed', loading: false });
    }
  },
}));
