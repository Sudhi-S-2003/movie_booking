import { motion } from 'framer-motion';
import { Play, Info, ChevronRight, Star, Heart, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { moviesApi } from '../services/api/index.js';
import { useBookingStore } from '../store/bookingStore.js';
import { SEO } from '../components/common/SEO.js';
import { PAGE_META } from '../constants/seo.constants.js';

import { useQuery } from '@tanstack/react-query';

export const Home = () => {
  const { searchQuery } = useBookingStore();

  const { data: trendingRes, isLoading: trendingLoading } = useQuery({
    queryKey: ['movies', 'trending', searchQuery],
    queryFn: () => searchQuery
      ? moviesApi.list({ search: searchQuery })
      : moviesApi.list({ status: 'now-showing', limit: 12 }),
  });

  const { data: upcomingRes, isLoading: upcomingLoading } = useQuery({
    queryKey: ['movies', 'upcoming'],
    queryFn: () => moviesApi.list({ status: 'upcoming', limit: 12 }),
    enabled: !searchQuery,
  });

  const loading = trendingLoading || upcomingLoading;
  const trending = trendingRes?.movies || [];
  const upcoming = upcomingRes?.movies || [];

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse uppercase tracking-[1em] text-accent-pink/50">Loading movies...</div>;

  const heroMovie = trending[0] || upcoming[0];
  if (!heroMovie) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <Info size={48} className="text-gray-800" />
      <p className="font-black uppercase tracking-[0.2em] text-gray-700">No movies found in your area</p>
    </div>
  );

  return (
    <div className="pb-20 space-y-16">
      <SEO 
        title={PAGE_META.HOME.TITLE} 
        description={PAGE_META.HOME.DESCRIPTION} 
      />

      { }
      <section className="relative h-[85vh] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-[40px] shadow-2xl">
        { }
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
          <img
            src={heroMovie.backdropUrl}
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
            alt="Hero Backdrop"
          />
        </div>

        { }
        <div className="relative z-20 h-full flex flex-col justify-center px-10 sm:px-20 max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent-pink/20 text-accent-pink text-xs font-black uppercase tracking-widest mb-4">
              Trending Now
            </span>
            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-white leading-tight">
              {heroMovie.title}
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-lg text-gray-300 max-w-xl font-medium leading-relaxed"
          >
            {heroMovie.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-4 pt-4"
          >
            <button className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black hover:scale-105 transition-transform active:scale-95">
              <Play size={20} fill="currentColor" /> Watch Trailer
            </button>
            <Link to={`/movie/${heroMovie._id}`} className="flex items-center gap-3 bg-white/10 backdrop-blur-md text-white border border-white/10 px-8 py-4 rounded-2xl font-black hover:bg-white/20 transition-all shadow-xl">
              <Info size={20} /> Booking Now
            </Link>
          </motion.div>
        </div>
      </section>

      { }
      {searchQuery ? (
        <Carousel title={`Search Results for "${searchQuery}"`} movies={trending} />
      ) : (
        <>
          <Carousel title="Trending Now" movies={trending} />
          <Carousel title="Upcoming Blockbusters" movies={upcoming} />
          {trending.length > 4 && (
            <Carousel title="Must Watch" movies={trending.slice().reverse()} />
          )}
        </>
      )}

    </div>
  );
};

const Carousel = ({ title, movies }: { title: string; movies: any[] }) => {
  const formatInterestCount = (count: number) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-4 sm:px-0">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          {title} <ChevronRight className="text-accent-pink" />
        </h2>
        <Link 
          to={`/movies?status=${title.toLowerCase().includes('upcoming') ? 'upcoming' : 'now-showing'}`} 
          className="text-sm font-bold text-accent-blue hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {movies.map((movie) => (
          <motion.div
            key={movie._id}
            whileHover={{ y: -10 }}
            className="flex-shrink-0 w-64 group relative cursor-pointer"
          >
            <Link to={`/movie/${movie._id}`}>
              <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <img
                  src={movie.posterUrl}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt={movie.title}
                />

                { }
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  {movie.isInterested && (
                    <div className="bg-accent-pink/90 backdrop-blur-md p-1.5 rounded-lg shadow-lg">
                      <Heart size={14} fill="white" className="text-white" />
                    </div>
                  )}
                  {movie.isWatchlisted && (
                    <div className="bg-accent-blue/90 backdrop-blur-md p-1.5 rounded-lg shadow-lg">
                      <BookmarkCheck size={14} fill="white" className="text-white" />
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 z-10">
                  {movie.showStatus === 'upcoming' ? (
                    <>
                      <Star size={12} className="text-accent-blue" fill="currentColor" />
                      <span className="text-[10px] font-black text-white">{formatInterestCount(movie.interestedUsers?.length || 0)} Likes</span>
                    </>
                  ) : (
                    <>
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-black text-white">{movie.rating || 'N/A'}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="font-black text-white group-hover:text-accent-pink transition-colors truncate">
                  {movie.title}
                </h3>
                <p className="text-xs text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {Array.isArray(movie.genres) ? movie.genres.join(', ') : movie.genres}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
