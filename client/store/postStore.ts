import { create } from 'zustand';
import { Post, Like, Comment } from '@/types/Post';


interface PostStoreState {
  posts: Post[];
  likes: { [postId: string]: Like[] };
  comments: { [postId: string]: Comment[] };
  setPosts: (posts: Post[]) => void;
  setLikes: (postId: string, likes: Like[]) => void;
  setComments: (postId: string, comments: Comment[]) => void;
  updatePost: (post: Post) => void;
  addPost: (post: Post) => void;
  removePost: (postId: string) => void;
  replacePost: (tempId: string, realPost: Post) => void;
  addLikeOrToggle: (postId: string, like: Like | undefined, userId: string) => void;
  removeLike: (postId: string, likeId: string) => void;
  addComment: (postId: string, comment: Comment) => void;
  replaceComment: (postId: string, tempId: string, realComment: Comment) => void;
}

export const usePostStore = create<PostStoreState>((set, get) => ({
  posts: [],
  likes: {},
  comments: {},
  setPosts: (posts) => set({ posts }),
  setLikes: (postId, likesArr) => set(state => ({ likes: { ...state.likes, [postId]: likesArr } })),
  setComments: (postId, commentsArr) => set(state => ({ comments: { ...state.comments, [postId]: commentsArr } })),
  updatePost: (post) => set(state => ({
    posts: state.posts.map(p => p.id === post.id ? post : p)
  })),
  addPost: (post) => set(state => ({
    posts: [post, ...state.posts]
  })),
  removePost: (postId) => set(state => ({
    posts: state.posts.filter(p => p.id !== postId)
  })),
  replacePost: (tempId, realPost) => set(state => ({
    posts: state.posts.map(p => p.id === tempId ? realPost : p),
    likes: { ...state.likes, [realPost.id]: state.likes[tempId] || [] },
    comments: { ...state.comments, [realPost.id]: state.comments[tempId] || [] }
  })),
  addLikeOrToggle: (postId, like, userId) => set(state => {
    const currentLikes = state.likes[postId] || [];
    const alreadyLiked = currentLikes.some(l => l.user_id === userId);
    if (alreadyLiked || like === undefined) {
      return {
        likes: {
          ...state.likes,
          [postId]: currentLikes.filter(l => l.user_id !== userId)
        }
      };
    } else {
      return {
        likes: {
          ...state.likes,
          [postId]: [...currentLikes, like]
        }
      };
    }
  }),
  removeLike: (postId, likeId) => set(state => ({
    likes: { ...state.likes, [postId]: (state.likes[postId] || []).filter(l => l.id !== likeId) }
  })),
  addComment: (postId, comment) => set(state => {
    const currentComments = state.comments[postId] || [];
    if (comment.parent_id) {
      
      const updatedComments = currentComments.map(c => {
        if (c.id === comment.parent_id) {
          return {
            ...c,
            replies: [...(c.replies || []), comment]
          };
        }
        return c;
      });
      return { comments: { ...state.comments, [postId]: updatedComments } };
    } else {
      // It's a root comment
      return { comments: { ...state.comments, [postId]: [...currentComments, comment] } };
    }
  }),
  replaceComment: (postId, tempId, realComment) => set(state => {
    const currentComments = state.comments[postId] || [];
    const replaceInComments = (comments: Comment[]): Comment[] => {
      return comments.map(c => {
        if (c.id === tempId) {
          return realComment;
        }
        if (c.replies) {
          return { ...c, replies: replaceInComments(c.replies) };
        }
        return c;
      });
    };
    return { comments: { ...state.comments, [postId]: replaceInComments(currentComments) } };
  }),
}));
