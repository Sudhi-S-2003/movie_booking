import { http } from './http.js';
import type {
  CreateReviewBody,
  ReviewResponse,
  ReviewsListResponse,
} from '../../types/api.js';

export interface ReviewsListQuery {
  page?:  number;
  limit?: number;
}

export const reviewsApi = {
  create: (data: CreateReviewBody) => http.post<ReviewResponse>('/reviews', data),

  listByTarget: (targetId: string, params?: ReviewsListQuery) =>
    http.get<ReviewsListResponse>(`/reviews/${targetId}`, {
      params: (params ?? {}) as Record<string, unknown>,
    }),
};
