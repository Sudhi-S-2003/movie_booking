import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { theatresApi } from '../services/api/index.js';
import { useDebounce } from './useDebounce.js';

export function useTheatreDetails(
  theatreId: string | undefined,
  selectedDate?: string
) {
  const [searchParams] = useSearchParams();
  const movieId = searchParams.get('movieId') || undefined;
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [page, setPage] = useState(1);

  const { data: theatreRes, isLoading: theatreLoading } = useQuery({
    queryKey: ['theatre', theatreId],
    queryFn: () => theatresApi.getById(theatreId!),
    enabled: !!theatreId,
  });

  const { data: showtimesRes, isLoading: showtimesLoading } = useQuery({
    queryKey: ['theatre', 'showtimes', theatreId, selectedDate, debouncedSearch, page, movieId],
    queryFn: () => theatresApi.getShowtimes(theatreId!, { date: selectedDate, q: debouncedSearch, page, movieId }),
    enabled: !!theatreId,
  });

  const { data: reviewsRes, isLoading: reviewsLoading } = useQuery({
    queryKey: ['theatre', 'reviews', theatreId],
    queryFn: () => theatresApi.reviews(theatreId!, { page: 1, limit: 10 }),
    enabled: !!theatreId,
  });

  const movieGroupedShowtimes = showtimesRes?.showtimes.reduce((acc: any, st: any) => {
    const movieId = st.movieId._id;
    const screenId = st.screenId._id;

    if (!acc[movieId]) {
      acc[movieId] = {
        id: movieId,
        title: st.movieId.title,
        posterUrl: st.movieId.posterUrl,
        backdropUrl: st.movieId.backdropUrl,
        certification: st.movieId.certification,
        genres: st.movieId.genres,
        screens: {}
      };
    }

    if (!acc[movieId].screens[screenId]) {
      acc[movieId].screens[screenId] = {
        name: st.screenId.name,
        format: st.format,
        times: []
      };
    }

    acc[movieId].screens[screenId].times.push({
      id: st._id,
      time: new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    return acc;
  }, {}) || {};

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  return {
    theatre: theatreRes?.theatre,
    reviews: reviewsRes?.reviews || [],
    moviesWithShowtimes: movieGroupedShowtimes,
    pagination: showtimesRes?.pagination || null,
    theatreLoading,
    showtimesLoading,
    reviewsLoading,
    searchQuery,
    page,
    setSearchQuery: handleSearch,
    setPage
  };
}
