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
  from?:  string;
  to?:    string;
}

/**
 * Strip undefined so `exactOptionalPropertyTypes` stays happy and so we
 * don't stuff `undefined` into axios params (which gets serialized as the
 * literal string "undefined").
 */
const cleanParams = (obj: Record<string, unknown> | undefined): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (!obj) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
};

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
};
