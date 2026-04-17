import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Share2, Play, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useBookingStore } from '../store/bookingStore.js';
import { useAuthStore } from '../store/authStore.js';
import { ThumbsUp, Bookmark, BookmarkCheck, MessageSquare, Send, Hash } from 'lucide-react';
import { TagCloud } from '../components/ui/TagCloud.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useMovieDetails } from '../hooks/useMovieDetails.js';
import { useMovieInteractions } from '../hooks/useMovieInteractions.js';
import { formatCountCompact } from '../utils/format.js';

export const MovieDetails = () => {
  const { id } = useParams();
  const { selectedCity } = useBookingStore();
  const { user, isAuthenticated } = useAuthStore();

  const {
    movie,
    reviews,
    groupedShowtimes: showtimesByTheatre,
    loading,
    isInterested,
    isWatchlisted,
    setMovie,
    setReviews,
    setIsInterested,
    setIsWatchlisted,
  } = useMovieDetails(id, selectedCity);

  const { toggleInterest, toggleWatchlist, submitReview } = useMovieInteractions(id);

  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [activeTab, setActiveTab] = useState<'SHOWTIMES' | 'REVIEWS'>('SHOWTIMES');

  useDocumentTitle(movie?.title);

  const handleToggleInterest = async () => {
    const result = await toggleInterest();
    if (!result || !movie) return;
    setIsInterested(result.isInterested);
    setMovie({ ...movie, interestedUsers: result.interestedUsers });
  };

  const handleToggleWatchlist = async () => {
    const added = await toggleWatchlist();
    if (added !== null) setIsWatchlisted(added);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const review = await submitReview(newReview);
    if (!review) {
      alert('Failed to submit review');
      return;
    }
    const authoredUserId = user
      ? { _id: user.id, name: user.name }
      : review.userId;
    setReviews([{ ...review, userId: authoredUserId }, ...reviews]);
    setNewReview({ rating: 5, comment: '' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING CINEMATIC DATA...</div>;
  if (!movie) return <div className="min-h-screen flex items-center justify-center font-black">MOVIE NOT FOUND</div>;

  return (
    <div className="pb-32">
      
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
                  className={`flex-1 sm:flex-none px-12 py-5 rounded-[24px] font-black transition-all shadow-2xl flex items-center gap-3 ${isInterested ? 'bg-white/20 text-white' : 'bg-accent-blue text-white shadow-accent-blue/30'}`}
                >
                  <ThumbsUp size={20} fill={isInterested ? 'currentColor' : 'none'} /> 
                  {isInterested ? 'Interested' : 'I\'m Interested'}
                </button>
              ) : (
                <button className="flex-1 sm:flex-none px-12 py-5 bg-accent-pink text-white rounded-[24px] font-black hover:scale-105 transition-all shadow-[0_20px_50px_rgba(255,51,102,0.3)]">Book Tickets Now</button>
              )}
              
              <button 
                onClick={handleToggleWatchlist}
                className="p-5 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all text-white"
              >
                {isWatchlisted ? <BookmarkCheck size={24} className="text-accent-pink" /> : <Bookmark size={24} />}
              </button>
              <button className="p-5 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all text-white"><Share2 size={24} /></button>
            </div>

            {}
            <div className="pt-8 border-t border-white/5">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Top Billing Cast</h3>
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
                <h3 className="text-3xl font-black uppercase tracking-tighter">Cinematic <span className="text-accent-pink">Transmission</span></h3>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full">4K ULTRA HD</span>
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
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">The Creative Node</h4>
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
                              <p className="text-xs font-black text-white">IMAX LASER</p>
                          </div>
                          <div className="bg-black/30 p-4 rounded-3xl border border-white/5">
                              <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Audio</p>
                              <p className="text-xs font-black text-white">DOLBY ATMOS</p>
                          </div>
                      </div>
                  </div>
              </div>

              {}
              <div className="bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[50px] p-10 space-y-8">
                  <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Archive Identities</h4>
                      <Hash size={18} className="text-accent-pink" />
                  </div>
                  <TagCloud tags={movie.tags || []} variant="pink" />
              </div>
          </div>
      </section>

      {}
      <section className="mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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
              Reviews ({reviews.length})
            </button>
          </div>
          
          {activeTab === 'SHOWTIMES' && (
            <div className="flex items-center gap-3 bg-white/5 rounded-3xl p-2 border border-white/10">
              <div className="px-6 py-2.5 bg-accent-blue/20 text-accent-blue rounded-2xl text-xs font-black flex items-center gap-2">
                <Calendar size={14} /> SUN, 12 APR
              </div>
              <div className="px-6 py-2.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-400">MON, 13 APR</div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'SHOWTIMES' ? (
            <motion.div 
              key="showtimes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 gap-8"
            >
              {Object.keys(showtimesByTheatre).length > 0 ? (
                Object.values(showtimesByTheatre).map((theatre: any) => (
                  <motion.div 
                    key={theatre.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-surface/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 hover:bg-surface/60 transition-all group"
                  >
                    <div className="flex flex-col gap-10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Link to={`/theatre/${theatre.id}`} className="text-3xl font-black text-white hover:text-accent-blue transition-colors flex items-center gap-3">
                            {theatre.name}
                            <span className="text-[10px] bg-accent-blue/10 text-accent-blue px-3 py-1 rounded-lg uppercase tracking-widest">{theatre.city}</span>
                          </Link>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Premium Cinema Experience</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-8">
                        {Object.values(theatre.screens).map((screen: any) => (
                          <div key={screen.name} className="space-y-4 border-t border-white/5 pt-6">
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-accent-pink shadow-[0_0_10px_rgba(255,51,102,0.8)]" /> 
                                <span className="text-sm font-black text-white uppercase tracking-wider">{screen.name}</span>
                                <span className="text-[10px] bg-white/5 text-gray-400 px-3 py-1 rounded-lg border border-white/10">{screen.format}</span>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              {screen.times.map((st: any) => (
                                <Link 
                                  key={st.id}
                                  to={`/booking/${st.id}`}
                                  className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-black text-accent-blue hover:bg-accent-blue hover:text-white hover:scale-105 transition-all outline-none shadow-xl"
                                >
                                  {st.time}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                  <p className="text-gray-500 font-black text-xl italic opacity-50">No showtimes found for this movie in your city.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="reviews"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {}
              {isAuthenticated && (
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent-pink to-accent-purple flex items-center justify-center text-sm font-bold text-white">
                      {user?.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-white">Share your experience</h4>
                      <div className="flex gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star} 
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className={`transition-all ${newReview.rating >= star ? 'text-yellow-500 scale-110' : 'text-gray-600'}`}
                          >
                            <Star size={18} fill={newReview.rating >= star ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleSubmitReview} className="relative">
                    <textarea 
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      placeholder="Was it worth the wait? Tell us what you thought..." 
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm outline-none focus:border-accent-pink transition-all h-32 resize-none"
                    />
                    <button 
                      type="submit"
                      className="absolute bottom-4 right-4 bg-accent-pink text-white p-3 rounded-xl hover:scale-110 active:scale-95 transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              )}

              {}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.length > 0 ? reviews.map((review) => {
                  const author = typeof review.userId === 'object' && review.userId !== null
                    ? review.userId
                    : null;
                  const authorName = author?.name ?? 'Anonymous';
                  return (
                  <div key={review._id} className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 group hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black text-gray-400">
                          {authorName[0]}
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">{authorName}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                        <Star size={12} className="text-yellow-500" fill="currentColor" />
                        <span className="text-xs font-black text-yellow-500">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm italic italic leading-relaxed">"{review.comment}"</p>
                  </div>
                  );
                }) : (
                  <div className="col-span-full text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                    <MessageSquare size={48} className="text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 font-black text-xl italic opacity-50">No reviews yet. Be the first to share!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </div>
  );
};
