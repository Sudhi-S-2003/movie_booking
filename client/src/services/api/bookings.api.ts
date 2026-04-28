import { http } from './http.js';
import type {
  ConfirmBookingResponse,
  LockSeatResponse,
  MyBookingsResponse,
  ShowtimeDetailsResponse,
  ShowtimesListResponse,
  UnlockSeatResponse,
} from '../../types/api.js';

export const bookingsApi = {
  getShowtimeDetails: (id: string) =>
    http.get<ShowtimeDetailsResponse>(`/booking/showtime/${id}`),

  getShowtimesByMovie: (movieId: string, city?: string, date?: string) =>
    http.get<ShowtimesListResponse>(`/booking/movie/${movieId}`, {
      params: { 
        ...(city ? { city } : {}),
        ...(date ? { date } : {})
      },
    }),

  lockSeats: (showtimeId: string, seatIds: string[], prices: number[]) =>
    http.post<LockSeatResponse>('/booking/lock', { showtimeId, seatIds, prices }),

  unlockSeats: (showtimeId: string, seatIds: string[]) =>
    http.post<UnlockSeatResponse>('/booking/unlock', { showtimeId, seatIds }),

  confirm: (reservationIds: string[]) =>
    http.post<ConfirmBookingResponse>('/booking/confirm', { reservationIds }),

  getMyBookings: (params?: { page?: number; limit?: number }) =>
    http.get<MyBookingsResponse>('/booking/my-bookings', {
      params: (params ?? {}) as Record<string, unknown>,
    }),

  getPublicTicket: (id: string, sig: string) =>
    http.get<any>(`/booking/public/${id}`, {
      params: { sig },
    }),
};

