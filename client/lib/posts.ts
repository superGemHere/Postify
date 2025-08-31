import { supabase } from './supabase';

export interface Post {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string;
  created_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export async function fetchPosts(limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Post[];
}

export async function fetchLikes(postId: string) {
  const { data, error } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId);
  if (error) throw error;
  return data as Like[];
}

export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Comment[];
}
