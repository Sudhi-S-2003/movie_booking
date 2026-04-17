import { http } from './http.js';
import type {
  ScreenResponse,
  ScreensListResponse,
  ShowtimeResponse,
  TheatreResponse,
  TheatresListResponse,
  ShowtimesListResponse,
} from '../../types/api.js';
import type { LayoutRow, Screen, Showtime, Theatre } from '../../types/models.js';

export interface AdminTheatresQuery {
  q?: string;
  page?: number;
  limit?: number;
}

export const adminApi = {
  listTheatres: (params?: AdminTheatresQuery) =>
    http.get<TheatresListResponse>('/admin/theatres', {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  createTheatre: (data: Partial<Theatre>) =>
    http.post<TheatreResponse>('/admin/theatres', data),

  listScreens: (theatreId: string, params?: { page?: number; limit?: number }) =>
    http.get<ScreensListResponse>(`/admin/theatres/${theatreId}/screens`, {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  updateScreenLayout: (screenId: string, layout: LayoutRow[], totalCapacity: number) =>
    http.put<ScreenResponse>(`/admin/screens/${screenId}/layout`, {
      layout,
      totalCapacity,
    }),

  createScreen: (data: Partial<Screen>) =>
    http.post<ScreenResponse>('/admin/screens', data),

  createShowtime: (data: Partial<Showtime>) =>
    http.post<ShowtimeResponse>('/admin/showtimes', data),

  listShowtimesByScreen: (screenId: string, params?: { page?: number; limit?: number }) =>
    http.get<ShowtimesListResponse>(`/admin/screens/${screenId}/showtimes`, {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  updateShowtime: (id: string, data: Partial<Showtime>) =>
    http.put<ShowtimeResponse>(`/admin/showtimes/${id}`, data),

  deleteShowtime: (id: string) =>
    http.delete<{ message: string }>(`/admin/showtimes/${id}`),
};
