import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Share2, Play, Clock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useBookingStore } from '../store/bookingStore.js';
import { ThumbsUp, Bookmark, BookmarkCheck, Hash } from 'lucide-react';
import { TagCloud } from '../components/ui/TagCloud.js';
import { DateSelector } from '../components/ui/DateSelector.js';
import { useMovieDetails } from '../hooks/useMovieDetails.js';
import { useMovieInteractions } from '../hooks/useMovieInteractions.js';
import { formatCountCompact } from '../utils/format.js';
import { ReviewSection } from '../components/ReviewSection.js';
import { FilterBar } from '../components/browse/FilterBar.js';
import { PaginationBar } from '../components/browse/PaginationBar.js';
import { TheatreShowtimeCard } from '../components/detail/TheatreShowtimeCard.js';
import { SEO } from '../components/common/SEO.js';

export const MovieDetails = () => {
  const { id } = useParams();
  const { selectedCity } = useBookingStore();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0] || '');

  const {
    movie,
    groupedShowtimes: showtimesByTheatre,
    movieLoading,
    showtimesLoading,
    pagination,
    searchQuery,
    setSearchQuery,
    setPage,
    isInterested,
    isWatchlisted,
  } = useMovieDetails(id, selectedCity, selectedDate);

  const { toggleInterest, toggleWatchlist, isTogglingInterest, isTogglingWatchlist } = useMovieInteractions(id);

  const [activeTab, setActiveTab] = useState<'SHOWTIMES' | 'REVIEWS'>('SHOWTIMES');


  const handleToggleInterest = async () => {
    try {
      await toggleInterest();
    } catch (err) {
      console.error('Failed to toggle interest', err);
    }
  };

  const handleToggleWatchlist = async () => {
    try {
      await toggleWatchlist();
    } catch (err) {
      console.error('Failed to toggle watchlist', err);
    }
  };


  if (movieLoading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse uppercase tracking-[0.5em] text-gray-500">Initializing Cinema Experience...</div>;
  if (!movie) return <div className="min-h-screen flex items-center justify-center font-black">MOVIE NOT FOUND</div>;

  return (
    <div className="pb-32">
      <SEO 
        title={movie.title} 
        description={movie.description} 
        ogImage={movie.posterUrl}
        ogType="video.movie"
      />
      
      {}
      <div className="relative h-[65vh] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-[60px] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
        <img 
          src={movie.backdropUrl} 
          className="w-full h-full object-cover scale-105 animate-slow-zoom"
          alt="Movie Backdrop"
        />
        
        <motion.button 
          whileHover={{ scale: 1.1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-24 h-24 bg-accent-pink/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl shadow-accent-pink/50 group"
        >
          <Play size={36} className="text-white ml-2 fill-white group-hover:scale-110 transition-transform" />
        </motion.button>
      </div>

      {}
      <div className="relative z-20 -mt-48 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
          
          {}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="md:col-span-4 lg:col-span-3 hidden md:block"
          >
            <div className="aspect-[2/3] rounded-[48px] overflow-hidden shadow-[0_48px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-white/5">
              <img 
                src={movie.posterUrl} 
                className="w-full h-full object-cover" 
                alt="Movie Poster"
              />
            </div>
          </motion.div>

          {}
          <div className="md:col-span-8 lg:col-span-9 space-y-8 pb-4">
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-6xl sm:text-8xl font-black tracking-tighter text-white leading-tight drop-shadow-2xl"
              >
                {movie.title}
              </motion.h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-black">
                {movie.showStatus === 'upcoming' ? (
                  <span className="flex items-center gap-1.5 text-accent-blue bg-accent-blue/10 px-4 py-2 rounded-2xl border border-accent-blue/20">
                    <ThumbsUp size={14} fill="currentColor" /> {formatCountCompact(movie.interestedUsers?.length ?? 0)} interested
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-2xl border border-yellow-500/20">
                    <Star size={14} fill="currentColor" /> {movie.rating || 'N/A'}
                  </span>
                )}
                <span className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 uppercase text-accent-blue">{movie.certification} | {movie.language}</span>
                <span className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2"><Clock size={14} /> {movie.duration}m</span>
                <TagCloud tags={movie.genres} variant="pink" />
              </div>
            </div>

            <p className="text-gray-400 max-w-2xl text-lg font-medium leading-relaxed italic opacity-80 line-clamp-3">
              "{movie.description}"
            </p>

            <div className="flex gap-4">
              {movie.showStatus === 'upcoming' ? (
                <button 
                  onClick={handleToggleInterest}
                  disabled={isTogglingInterest}
                  className={`flex-1 sm:flex-none px-12 py-5 rounded-[24px] font-black transition-all shadow-2xl flex items-center gap-3 ${isInterested ? 'bg-white/20 text-white' : 'bg-accent-blue text-white shadow-accent-blue/30'}`}
                >
                  <ThumbsUp size={20} fill={isInterested ? 'currentColor' : 'none'} className={isTogglingInterest ? 'animate-bounce' : ''} /> 
                  {isInterested ? 'Interested' : 'I\'m Interested'}
                </button>
              ) : (
                <button 
                  onClick={() => document.getElementById('showtimes-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex-1 sm:flex-none px-12 py-5 bg-accent-pink text-white rounded-[24px] font-black hover:scale-105 transition-all shadow-[0_20px_50px_rgba(255,51,102,0.3)]"
                >
                  Book Tickets Now
                </button>
              )}
              
              <button 
                onClick={handleToggleWatchlist}
                disabled={isTogglingWatchlist}
                className="p-5 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all text-white"
              >
                {isWatchlisted ? <BookmarkCheck size={24} className="text-accent-pink" /> : <Bookmark size={24} className={isTogglingWatchlist ? 'animate-pulse' : ''} />}
              </button>
              <button className="p-5 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all text-white"><Share2 size={24} /></button>
            </div>

            {}
            <div className="pt-8 border-t border-white/5">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Cast</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {movie.cast?.map((member: any, i: number) => (
                        <div key={i} className="flex-shrink-0 flex items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-2.5 rounded-2xl">
                            <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden border border-white/10">
                                {member.profileUrl ? (
                                    <img src={member.profileUrl} className="w-full h-full object-cover" alt={member.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{member.name[0]}</div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white whitespace-nowrap">{member.name}</p>
                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{member.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>

      {}
      <section className="mt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
          {}
          <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Official <span className="text-accent-pink">Trailer</span></h3>
                <div className="flex gap-2">
                    {(movie.technicalSpecs?.length ? movie.technicalSpecs : ['4K ULTRA HD', 'IMAX']).map((spec, i) => (
                        <span key={i} className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{spec}</span>
                    ))}
                </div>
              </div>
              <div className="aspect-video rounded-[50px] overflow-hidden bg-black/40 border border-white/10 shadow-2xl relative group">
                {movie.trailerUrl ? (
                    <iframe 
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${movie.trailerUrl.split('v=')[1] || movie.trailerUrl.split('/').pop()}?autoplay=0&mute=0&controls=1`}
                        title="Movie Trailer"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center italic text-gray-600 font-bold">No trailer stream available</div>
                )}
                <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20 rounded-[50px]" />
              </div>
          </div>

          {}
          <div className="lg:col-span-4 space-y-10">
              <div className="bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[50px] p-10 space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Crew</h4>
                    <div className="space-y-6">
                        {movie.crew?.map((member: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div>
                                    <p className="text-sm font-black text-white group-hover:text-accent-blue transition-colors">{member.name}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{member.job}</p>
                                </div>
                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-accent-blue/10 group-hover:text-accent-blue transition-all">
                                    <ShieldCheck size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Technical Specs</h4>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                              <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Visuals</p>
                              <p className="text-xs font-black text-white">{movie.technicalSpecs?.[0] || 'IMAX LASER'}</p>
                          </div>
                          <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                              <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Audio</p>
                              <p className="text-xs font-black text-white">{movie.technicalSpecs?.[1] || 'DOLBY ATMOS'}</p>
                          </div>
                      </div>
                  </div>
              </div>

              {}
              <div className="bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[50px] p-10 space-y-8">
                  <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Tags</h4>
                      <Hash size={18} className="text-accent-pink" />
                  </div>
                  <TagCloud tags={movie.tags || []} variant="pink" />
              </div>
          </div>
      </section>

      {}
      <section id="showtimes-section" className="mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="flex items-center gap-10">
            <button 
              onClick={() => setActiveTab('SHOWTIMES')}
              className={`text-2xl font-black pb-3 transition-colors ${activeTab === 'SHOWTIMES' ? 'text-white border-b-4 border-accent-pink' : 'text-gray-500 hover:text-white'}`}
            >
              Available Showtimes
            </button>
            <button 
              onClick={() => setActiveTab('REVIEWS')}
              className={`text-2xl font-black pb-3 transition-colors ${activeTab === 'REVIEWS' ? 'text-white border-b-4 border-accent-pink' : 'text-gray-500 hover:text-white'}`}
            >
              Reviews
            </button>
          </div>
          
          {activeTab === 'REVIEWS' && (
            <Link 
              to={`/movie/${id}/reviews`}
              className="text-[10px] font-black text-accent-pink uppercase tracking-widest bg-accent-pink/10 px-6 py-2.5 rounded-xl border border-accent-pink/20 hover:bg-accent-pink/20 transition-all"
            >
              View All Reviews
            </Link>
          )}
          
          {activeTab === 'SHOWTIMES' && (
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate} 
            />
          )}
        </div>

        {activeTab === 'SHOWTIMES' && (
          <div className="mt-8">
            <FilterBar 
              searchPlaceholder="Search theatres or cities..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'SHOWTIMES' ? (
            <motion.div 
              key="showtimes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 gap-8"
            >
              {showtimesLoading ? (
                <div className="space-y-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-white/5 rounded-[40px] animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : Object.keys(showtimesByTheatre).length > 0 ? (
                Object.values(showtimesByTheatre).map((theatre: any) => (
                  <TheatreShowtimeCard key={theatre.id} theatre={theatre} currentMovieId={id} />
                ))
              ) : (
                <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                  <p className="text-gray-500 font-black text-xl italic opacity-50">No showtimes found for this movie in your city.</p>
                </div>
              )}
              
              {pagination && pagination.totalPages > 1 && (
                <div className="pt-12 border-t border-white/5">
                  <PaginationBar 
                    pagination={pagination}
                    onChange={setPage}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="reviews"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ReviewSection 
                targetId={id!} 
                targetType="Movie" 
                targetName={movie.title}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </div>
  );
};
