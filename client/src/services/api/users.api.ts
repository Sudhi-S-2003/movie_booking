import { http } from './http.js';
import type {
  UserDetailsResponse,
  UsersListResponse,
  WatchlistListResponse,
  WatchlistStatusResponse,
  WatchlistToggleResponse,
} from '../../types/api.js';
import type { Post } from './posts.api.js';
import type { Pagination, Hashtag } from './hashtags.api.js';

export interface ProfileReview {
  _id:         string;
  userId:      string;
  targetId:    string;
  targetType:  string;
  rating:      number;
  comment?:    string;
  createdAt:   string;
  movie?: {
    _id:        string;
    title:      string;
    posterUrl?: string;
    backdropUrl?: string;
    genres?:    string[];
    language?:  string;
  } | null;
}

export interface ProfileWatchlistMovie {
  _id:        string;
  title:      string;
  posterUrl?: string;
  backdropUrl?: string;
  genres?:    string[];
  rating?:    number;
  duration?:  number;
  language?:  string;
}

export type ActivityItem =
  | { type: 'post';    createdAt: string; data: Post }
  | { type: 'review';  createdAt: string; data: ProfileReview }
  | { type: 'booking'; createdAt: string; data: {
      _id: string;
      seatId: string;
      price: number;
      status: string;
      createdAt: string;
      showtime?: { startTime: string; endTime: string } | null;
      movie?:    { _id: string; title: string; posterUrl?: string } | null;
    }};

export interface WatchlistListQuery {
  page?: number;
  limit?: number;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface UserProfile {
  _id:            string;
  name:           string;
  username:       string;
  email?:         string;
  phoneNumber?:   string;
  role:           string;
  avatar?:        string;
  coverImageUrl?: string;
  bio?:           string;
  location?:      string;
  website?:       string;
  pronouns?:      string;
  socialLinks?:   SocialLink[];
  followerCount?:  number;
  followingCount?: number;
  postCount?:      number;
  createdAt:      string;
  stats?: {
    bookings:  number;
    reviews:   number;
    watchlist: number;
    issues:    number;
    posts:     number;
    followers: number;
    following: number;
  };
}

export interface ProfileSummary {
  _id:      string;
  name:     string;
  username: string;
  avatar?:  string;
  role?:    string;
}

export interface UpdateMeBody {
  name?:          string;
  bio?:           string;
  avatar?:        string;
  coverImageUrl?: string;
  location?:      string;
  website?:       string;
  pronouns?:      string;
  phoneNumber?:   string;
  socialLinks?:   SocialLink[];
}

export const usersApi = {
  toggleWatchlist: (movieId: string) =>
    http.post<WatchlistToggleResponse>(`/users/watchlist/${movieId}`),

  getWatchlist: (params?: WatchlistListQuery) =>
    http.get<WatchlistListResponse>('/users/watchlist', {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  getWatchlistStatus: (movieId: string) =>
    http.get<WatchlistStatusResponse>(`/users/watchlist/${movieId}/status`),

  listAll: (params?: { page?: number; limit?: number; q?: string; role?: string }) =>
    http.get<UsersListResponse>('/users/all', {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  getById: (id: string) => http.get<UserDetailsResponse>(`/users/${id}`),

  // ─── Profile ────────────────────────────────────────────────────────────
  me: () => http.get<{ user: UserProfile }>('/users/me'),

  updateMe: (body: UpdateMeBody) =>
    http.patch<{ user: UserProfile }>('/users/me', body),

  getProfile: (handle: string) =>
    http.get<{ user: UserProfile; isSelf: boolean; isFollowing: boolean }>(
      `/users/${handle}/profile`,
    ),

  getProfilePosts: (
    handle: string,
    params?: { page?: number; limit?: number; sort?: 'latest' | 'top' },
  ) =>
    http.get<{ posts: Post[]; pagination: Pagination }>(
      `/users/${handle}/posts`,
      { params: params as Record<string, unknown> },
    ),

  getLikedPosts: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ posts: Post[]; pagination: Pagination }>(
      `/users/${handle}/likes`,
      { params: params as Record<string, unknown> },
    ),

  getFollowers: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ users: ProfileSummary[]; pagination: Pagination }>(
      `/users/${handle}/followers`,
      { params: params as Record<string, unknown> },
    ),

  getFollowing: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ users: ProfileSummary[]; pagination: Pagination }>(
      `/users/${handle}/following`,
      { params: params as Record<string, unknown> },
    ),

  getFollowedHashtags: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ hashtags: Hashtag[]; pagination: Pagination }>(`/users/${handle}/hashtags`, {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  toggleFollow: (handle: string) =>
    http.post<{ following: boolean }>(`/users/${handle}/follow`),

  getProfileReviews: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ reviews: ProfileReview[]; pagination: Pagination }>(
      `/users/${handle}/reviews`,
      { params: params as Record<string, unknown> },
    ),

  getProfileWatchlist: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ movies: ProfileWatchlistMovie[]; pagination: Pagination }>(
      `/users/${handle}/watchlist-public`,
      { params: params as Record<string, unknown> },
    ),

  getProfileActivity: (handle: string, params?: { limit?: number }) =>
    http.get<{ activity: ActivityItem[] }>(
      `/users/${handle}/activity`,
      { params: params as Record<string, unknown> },
    ),

  getProfileBookmarks: (handle: string, params?: { page?: number; limit?: number }) =>
    http.get<{ posts: Post[]; pagination: Pagination }>(
      `/users/${handle}/bookmarks`,
      { params: params as Record<string, unknown> },
    ),
};
