import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { reviewsApi } from '../services/api/index.js';
import type { CreateReviewBody } from '../types/api.js';

export function useReviews(targetId: string | undefined, targetType: 'Movie' | 'Theatre') {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reviews', targetId, page, sort],
    queryFn: () => reviewsApi.listByTarget(targetId!, { page, limit: 10, sort }),
    enabled: !!targetId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateReviewBody, 'targetId' | 'targetType'>) =>
      reviewsApi.create({ ...data, targetId: targetId!, targetType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', targetId] });
      // Also invalidate movie/theatre details to update average rating if needed
      queryClient.invalidateQueries({ queryKey: [targetType === 'Movie' ? 'movie' : 'theatre', targetId] });
    },
  });

  return {
    reviews: data?.reviews ?? [],
    stats: data?.stats ?? { averageRating: 0, totalReviews: 0, breakdown: [] },
    pagination: data?.pagination,
    isLoading,
    isError,
    error,
    page,
    setPage,
    sort,
    setSort,
    submitReview: createMutation.mutateAsync,
    isSubmitting: createMutation.isPending,
  };
}
