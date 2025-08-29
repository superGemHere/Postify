import { createClient } from '@supabase/supabase-js';
const apiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(apiUrl, apiKey);
