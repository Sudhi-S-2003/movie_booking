import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesApi, reviewsApi, usersApi } from '../services/api/index.js';
import { useAuthStore } from '../store/authStore.js';

export interface SubmitReviewInput {
  rating: number;
  comment: string;
}

export function useMovieInteractions(movieId: string | undefined) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const toggleInterestMutation = useMutation({
    mutationFn: () => moviesApi.toggleInterest(movieId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
    },
  });

  const toggleWatchlistMutation = useMutation({
    mutationFn: () => usersApi.toggleWatchlist(movieId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', movieId] });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: ({ rating, comment }: SubmitReviewInput) =>
      reviewsApi.create({
        targetId: movieId!,
        targetType: 'Movie',
        rating,
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', 'reviews', movieId] });
    },
  });

  return {
    toggleInterest: () => toggleInterestMutation.mutateAsync(),
    toggleWatchlist: () => toggleWatchlistMutation.mutateAsync(),
    submitReview: (input: SubmitReviewInput) => submitReviewMutation.mutateAsync(input),
    isTogglingInterest: toggleInterestMutation.isPending,
    isTogglingWatchlist: toggleWatchlistMutation.isPending,
    isSubmittingReview: submitReviewMutation.isPending,
  };
}
