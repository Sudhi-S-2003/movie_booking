import { http } from './http.js';
import type { Pagination } from './hashtags.api.js';

export interface PostAuthor {
  _id:       string;
  name:      string;
  username:  string;
  avatar?:   string;
  role?:     string;
}

export interface Post {
  _id:          string;
  authorId:     string;
  author?:      PostAuthor | null;
  title:        string;
  content:      string;
  excerpt?:     string;
  imageUrl?:    string;
  hashtags:     string[];
  likeCount:    number;
  commentCount: number;
  viewCount:    number;
  pinned:       boolean;
  liked?:       boolean;
  bookmarked?:  boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface PostComment {
  _id:        string;
  postId:     string;
  userId:     string;
  text:       string;
  parentId?:  string;
  likeCount:  number;
  liked?:     boolean;
  replyCount?: number;
  createdAt:  string;
  updatedAt:  string;
  user?: {
    _id:      string;
    name:     string;
    username: string;
    avatar?:  string;
  } | null;
  replies?: PostComment[];
}

export const postsApi = {
  listForHashtag: (slug: string, params?: { page?: number; limit?: number; sort?: 'latest' | 'top' | 'most_commented' }) =>
    http.get<{ posts: Post[]; pagination: Pagination }>(`/hashtags/${slug}/posts`, {
      params: params as Record<string, unknown>,
    }),

  get: (id: string) => http.get<{ post: Post }>(`/posts/${id}`),

  create: (data: { title: string; content: string; hashtags?: string[]; imageUrl?: string }) =>
    http.post<{ post: Post }>('/posts', data),

  update: (
    id: string,
    data: { title?: string; content?: string; hashtags?: string[]; imageUrl?: string },
  ) => http.patch<{ post: Post }>(`/posts/${id}`, data),

  remove: (id: string) => http.delete<{ deleted: boolean }>(`/posts/${id}`),

  toggleLike: (id: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`),

  toggleBookmark: (id: string) =>
    http.post<{ bookmarked: boolean }>(`/posts/${id}/bookmark`),

  // ─── Comments ────────────────────────────────────────────────────────────
  listComments: (postId: string, params?: { page?: number; limit?: number }) =>
    http.get<{ comments: PostComment[]; pagination: Pagination }>(
      `/posts/${postId}/comments`,
      { params: params as Record<string, unknown> },
    ),

  createComment: (postId: string, data: { text: string; parentId?: string }) =>
    http.post<{ comment: PostComment }>(`/posts/${postId}/comments`, data),

  deleteComment: (commentId: string) =>
    http.delete<{ deleted: boolean; deletedCount?: number }>(`/posts/comments/${commentId}`),

  listReplies: (commentId: string, params?: { page?: number; limit?: number }) =>
    http.get<{ replies: PostComment[]; pagination: Pagination }>(
      `/posts/comments/${commentId}/replies`,
      { params: params as Record<string, unknown> },
    ),

  updateComment: (commentId: string, data: { text: string }) =>
    http.patch<{ comment: PostComment }>(`/posts/comments/${commentId}`, data),

  likeComment: (commentId: string) =>
    http.post<{ liked: boolean; likeCount: number }>(`/posts/comments/${commentId}/like`),
};
