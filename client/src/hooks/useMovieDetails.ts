import { useQuery,  useQueryClient } from '@tanstack/react-query';
import { moviesApi, bookingsApi, reviewsApi } from '../services/api/index.js';
import { groupShowtimesByTheatre } from '../utils/groupShowtimes.js';
import type { Movie} from '../types/models.js';

export type MovieWithViewerFlags = Movie & {
  isInterested?: boolean;
  isWatchlisted?: boolean;
};

export function useMovieDetails(
  movieId: string | undefined,
  city: string | null | undefined,
  selectedDate?: string,
) {
  const queryClient = useQueryClient();

  const { data: movieRes, isLoading: movieLoading } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => moviesApi.getById(movieId!),
    enabled: !!movieId,
  });

  const { data: showtimesRes, isLoading: showtimesLoading } = useQuery({
    queryKey: ['movie', 'showtimes', movieId, city, selectedDate],
    queryFn: () => bookingsApi.getShowtimesByMovie(movieId!, city ?? undefined, selectedDate),
    enabled: !!movieId,
  });

  const { data: reviewsRes, isLoading: reviewsLoading } = useQuery({
    queryKey: ['movie', 'reviews', movieId],
    queryFn: () => reviewsApi.listByTarget(movieId!),
    enabled: !!movieId,
  });

  const movie = movieRes?.movie || null;
  const reviews = reviewsRes?.reviews || [];
  const groupedShowtimes = showtimesRes ? groupShowtimesByTheatre(showtimesRes.showtimes) : {};
  const loading = movieLoading || showtimesLoading || reviewsLoading;

  return {
    movie,
    reviews,
    groupedShowtimes,
    loading,
    isInterested: movie?.isInterested ?? false,
    isWatchlisted: movie?.isWatchlisted ?? false,
    // We'll handle updates via mutations in useMovieInteractions or directly here if needed
    // But for now, we'll expose a way to invalidate queries
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
      queryClient.invalidateQueries({ queryKey: ['movie', 'reviews', movieId] });
    }
  };
}
