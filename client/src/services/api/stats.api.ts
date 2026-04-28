import { http } from './http.js';

export interface PlatformStats {
  users:       number;
  movies:      number;
  nowShowing:  number;
  upcoming:    number;
  theatres:    number;
  showtimes:   number;
  bookings:    number;
  reviews:     number;
  posts:       number;
  hashtags:    number;
}

export interface GenreBucket {
  genre: string;
  count: number;
}

export interface DailyBookingBucket {
  _id:     string; // YYYY-MM-DD
  count:   number;
  revenue: number;
}

export interface TopMovieRow {
  _id:       string;
  title:     string;
  posterUrl?: string;
  bookings:  number;
}

export interface AdminStats {
  totals: {
    users:    number;
    movies:   number;
    theatres: number;
    bookings: number;
  };
  topGenres:      GenreBucket[];
  recentBookings: DailyBookingBucket[];
  topMovies:      TopMovieRow[];
}

export interface OwnerStats {
  totalTheatres:  number;
  totalScreens:   number;
  totalShowtimes: number;
  systemHealth:   number;
}

export const statsApi = {
  platform: () => http.get<{ stats: PlatformStats }>('/stats/platform'),
  admin:    () => http.get<{ stats: AdminStats }>('/stats/admin'),
  owner:    () => http.get<{ stats: OwnerStats }>('/stats/owner'),
};
