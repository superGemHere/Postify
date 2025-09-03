import { supabase } from './supabase';
import {Post, Like, Comment} from '@/types/Post';

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
