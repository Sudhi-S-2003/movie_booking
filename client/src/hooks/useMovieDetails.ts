import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { moviesApi, bookingsApi, reviewsApi } from '../services/api/index.js';
import { groupShowtimesByTheatre } from '../utils/groupShowtimes.js';
import { useDebounce } from './useDebounce.js';
import type { Movie } from '../types/models.js';

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
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(1);

  const { data: movieRes, isLoading: movieLoading } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => moviesApi.getById(movieId!),
    enabled: !!movieId,
  });

  const { data: showtimesRes, isLoading: showtimesLoading } = useQuery({
    queryKey: ['movie', 'showtimes', movieId, city, selectedDate, debouncedSearch, page],
    queryFn: () => bookingsApi.getShowtimesByMovie(movieId!, city ?? undefined, selectedDate, debouncedSearch, page),
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
  const pagination = showtimesRes?.pagination || null;

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  return {
    movie,
    reviews,
    groupedShowtimes,
    pagination,
    movieLoading,
    showtimesLoading,
    reviewsLoading,
    searchQuery,
    page,
    setSearchQuery: handleSearch,
    setPage,
    isInterested: movie?.isInterested ?? false,
    isWatchlisted: movie?.isWatchlisted ?? false,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
      queryClient.invalidateQueries({ queryKey: ['movie', 'reviews', movieId] });
    }
  };
}
