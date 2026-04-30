import { http } from './http.js';
import type {
  ReviewsListResponse,
  ShowtimesListResponse,
  TheatreResponseOnly,
  TheatresListResponse,
} from '../../types/api.js';

export interface TheatresListQuery {
  page?:  number;
  limit?: number;
  city?:  string;
  q?:     string;
}

export interface TheatreReviewsQuery {
  page?:  number;
  limit?: number;
}

export interface TheatreShowtimesQuery {
  page?:  number;
  limit?: number;
  date?:  string;
  q?:     string;
  movieId?: string;
}

import { cleanParams } from '../../utils/api.js';

export const theatresApi = {
  list: (params?: TheatresListQuery) =>
    http.get<TheatresListResponse>('/theatres', {
      params: cleanParams(params as Record<string, unknown> | undefined),
    }),

  getById: (id: string) => http.get<TheatreResponseOnly>(`/theatres/${id}`),

  reviews: (id: string, params?: TheatreReviewsQuery) =>
    http.get<ReviewsListResponse>(`/theatres/${id}/reviews`, {
      params: cleanParams(params as Record<string, unknown> | undefined),
    }),

  getShowtimes: (id: string, params?: TheatreShowtimesQuery) =>
    http.get<ShowtimesListResponse>(`/theatres/${id}/showtimes`, {
      params: cleanParams(params as Record<string, unknown> | undefined),
    }),

  getCities: (params?: { q?: string; page?: number; limit?: number }) =>
    http.get<{ cities: string[]; pagination: any }>('/theatres/cities', {
      params: cleanParams(params as Record<string, unknown> | undefined),
    }),
};
