import { http } from './http.js';
import type {
  MovieResponse,
  MoviesListQuery,
  MoviesListResponse,
  ToggleInterestResponse,
} from '../../types/api.js';
import type { Movie } from '../../types/models.js';

export const moviesApi = {
  list: (params?: MoviesListQuery) =>
    http.get<MoviesListResponse>('/movies', { params: params as Record<string, unknown> }),

  getById: (id: string) => http.get<MovieResponse>(`/movies/${id}`),

  create: (data: Partial<Movie>) => http.post<MovieResponse>('/movies', data),

  update: (id: string, data: Partial<Movie>) =>
    http.put<MovieResponse>(`/movies/${id}`, data),

  delete: (id: string) => http.delete<{ message: string }>(`/movies/${id}`),

  toggleInterest: (id: string) =>
    http.post<ToggleInterestResponse>(`/movies/${id}/interested`),
};
