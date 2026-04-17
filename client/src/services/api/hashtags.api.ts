import { http } from './http.js';
import type { Pagination } from '../../types/api.js';

export interface Hashtag {
  _id:           string;
  name:          string;
  slug:          string;
  description?:  string;
  color?:        string;
  coverImageUrl?: string;
  postCount:     number;
  followerCount: number;
  viewCount:     number;
  trendingScore: number;
  lastActiveAt:  string;
}

export interface RelatedHashtag {
  _id?:         string;
  slug:         string;
  name:         string;
  postCount:    number;
  color:        string;
  coOccurrence: number;
}

export const hashtagsApi = {
  trending: (limit = 10) =>
    http.get<{ hashtags: Hashtag[]; pagination: Pagination }>('/hashtags/trending', {
      params: { limit },
    }),

  list: (params?: { page?: number; limit?: number; search?: string }) =>
    http.get<{ hashtags: Hashtag[]; pagination: Pagination }>('/hashtags', {
      params: params as Record<string, unknown>,
    }),

  get: (slug: string) =>
    http.get<{ hashtag: Hashtag; isFollowing: boolean }>(`/hashtags/${slug}`),

  related: (slug: string, limit = 8) =>
    http.get<{ related: RelatedHashtag[] }>(`/hashtags/${slug}/related`, { params: { limit } }),

  follow: (slug: string) =>
    http.post<{ following: boolean }>(`/hashtags/${slug}/follow`),
};
