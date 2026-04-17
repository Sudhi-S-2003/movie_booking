
import { useEffect, useState } from 'react';
import { moviesApi, bookingsApi, reviewsApi } from '../services/api/index.js';
import { groupShowtimesByTheatre } from '../utils/groupShowtimes.js';
import type { GroupedTheatre } from '../utils/groupShowtimes.js';
import type { Movie, Review, ID } from '../types/models.js';

export type MovieWithViewerFlags = Movie & {
  isInterested?: boolean;
  isWatchlisted?: boolean;
};

export interface UseMovieDetailsResult {
  movie: MovieWithViewerFlags | null;
  reviews: Review[];
  groupedShowtimes: Record<ID, GroupedTheatre>;
  loading: boolean;
  isInterested: boolean;
  isWatchlisted: boolean;
  setMovie: React.Dispatch<React.SetStateAction<MovieWithViewerFlags | null>>;
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  setIsInterested: React.Dispatch<React.SetStateAction<boolean>>;
  setIsWatchlisted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useMovieDetails(
  movieId: string | undefined,
  city: string | null | undefined,
): UseMovieDetailsResult {
  const [movie, setMovie] = useState<MovieWithViewerFlags | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [groupedShowtimes, setGroupedShowtimes] = useState<Record<ID, GroupedTheatre>>({});
  const [loading, setLoading] = useState(true);
  const [isInterested, setIsInterested] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  useEffect(() => {
    if (!movieId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [movieRes, showtimesRes, reviewsRes] = await Promise.all([
          moviesApi.getById(movieId),
          bookingsApi.getShowtimesByMovie(movieId, city ?? undefined),
          reviewsApi.listByTarget(movieId),
        ]);
        if (cancelled) return;

        setMovie(movieRes.movie);
        setReviews(reviewsRes.reviews);
        setIsInterested(movieRes.movie.isInterested ?? false);
        setIsWatchlisted(movieRes.movie.isWatchlisted ?? false);
        setGroupedShowtimes(groupShowtimesByTheatre(showtimesRes.showtimes));
      } catch (err) {
        if (!cancelled) console.error('[useMovieDetails] fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId, city]);

  return {
    movie,
    reviews,
    groupedShowtimes,
    loading,
    isInterested,
    isWatchlisted,
    setMovie,
    setReviews,
    setIsInterested,
    setIsWatchlisted,
  };
}
