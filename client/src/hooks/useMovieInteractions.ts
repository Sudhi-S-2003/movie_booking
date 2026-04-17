
import { useCallback } from 'react';
import { moviesApi, reviewsApi, usersApi } from '../services/api/index.js';
import { useAuthStore } from '../store/authStore.js';
import type { ID, Review } from '../types/models.js';

export interface ToggleInterestResult {
  isInterested: boolean;
  interestedUsers: ID[];
}

export interface SubmitReviewInput {
  rating: number;
  comment: string;
}

export interface UseMovieInteractions {
  toggleInterest: () => Promise<ToggleInterestResult | null>;
  toggleWatchlist: () => Promise<boolean | null>;
  submitReview: (input: SubmitReviewInput) => Promise<Review | null>;
}

export function useMovieInteractions(movieId: string | undefined): UseMovieInteractions {
  const { isAuthenticated } = useAuthStore();

  const toggleInterest = useCallback(async () => {
    if (!movieId || !isAuthenticated) return null;
    try {
      const res = await moviesApi.toggleInterest(movieId);
      return { isInterested: res.isInterested, interestedUsers: res.interestedUsers };
    } catch (err) {
      console.error('[useMovieInteractions] toggleInterest', err);
      return null;
    }
  }, [movieId, isAuthenticated]);

  const toggleWatchlist = useCallback(async () => {
    if (!movieId || !isAuthenticated) return null;
    try {
      const res = await usersApi.toggleWatchlist(movieId);
      return res.added;
    } catch (err) {
      console.error('[useMovieInteractions] toggleWatchlist', err);
      return null;
    }
  }, [movieId, isAuthenticated]);

  const submitReview = useCallback(
    async ({ rating, comment }: SubmitReviewInput) => {
      if (!movieId || !isAuthenticated) return null;
      try {
        const res = await reviewsApi.create({
          targetId: movieId,
          targetType: 'Movie',
          rating,
          comment,
        });
        return res.review;
      } catch (err) {
        console.error('[useMovieInteractions] submitReview', err);
        return null;
      }
    },
    [movieId, isAuthenticated],
  );

  return { toggleInterest, toggleWatchlist, submitReview };
}
