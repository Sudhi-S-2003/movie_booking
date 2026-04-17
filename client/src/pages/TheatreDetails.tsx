import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Info, Star, Calendar, Clock, Share2, Send, MessageSquare, ParkingCircle, Utensils, Accessibility, Music, Tv, ShieldCheck, ExternalLink, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TagCloud } from '../components/ui/TagCloud.js';
import { theatresApi, reviewsApi } from '../services/api/index.js';
import { useAuthStore } from '../store/authStore.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PAGE_SIZE } from '../constants/pagination.js';

export const TheatreDetails = () => {
  const { id } = useParams();
  const [theatre, setTheatre] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [moviesWithShowtimes, setMoviesWithShowtimes] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SHOWTIMES' | 'REVIEWS'>('SHOWTIMES');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const { user, isAuthenticated } = useAuthStore();
  useDocumentTitle(theatre?.name);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [theatreRes, showtimesRes, reviewsRes] = await Promise.all([
          theatresApi.getById(id),
          theatresApi.getShowtimes(id, { limit: PAGE_SIZE.DEFAULT }),
          theatresApi.reviews(id, { page: 1, limit: PAGE_SIZE.REVIEWS }),
        ]);

        setTheatre(theatreRes.theatre);
        setReviews(reviewsRes.reviews);

        const grouped = showtimesRes.showtimes.reduce((acc: any, st: any) => {
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
        }, {});

        setMoviesWithShowtimes(grouped);
      } catch (error) {
        console.error('Error fetching theatre details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    try {
      const res = await reviewsApi.create({
        targetId: id!,
        targetType: 'Theatre',
        ...newReview
      });
      setReviews([{ ...res.review, userId: user }, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING THEATRE DATA...</div>;
  if (!theatre) return <div className="min-h-screen flex items-center justify-center font-black">THEATRE NOT FOUND</div>;

  return (
    <div className="pb-32">
      {}
      <div className="relative h-[40vh] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-[60px] shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-accent-blue/5 backdrop-blur-sm" />
        
        {}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-blue/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-pink/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        
        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 bg-accent-blue/20 text-accent-blue rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">Premium Partner</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} size={12} className="text-yellow-500 fill-yellow-500" />)}
              </div>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter">{theatre.name}</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-400 font-medium">
              <p className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-accent-blue/60 mt-2">{theatre.city} HUB</p>
            </div>
          </motion.div>
        </div>
      </div>

      {}
      <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {}
          <div className="lg:col-span-8 bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[50px] p-10 space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight">Facility <span className="text-accent-blue">Transmission</span></h3>
                    <Info size={20} className="text-gray-600" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <TagCloud tags={theatre.amenities || []} variant="blue" />
                </div>
          </div>

          {}
          <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-[50px] p-10 flex flex-col justify-between">
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Contact Node</h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-accent-pink/10 flex items-center justify-center text-accent-pink border border-accent-pink/20">
                                <MapPin size={20} />
                             </div>
                             <div>
                                 <p className="text-sm font-black text-white">{theatre.city}</p>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mt-1">{theatre.address}</p>
                             </div>
                        </div>
                        <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue border border-accent-blue/20">
                                <ShieldCheck size={20} />
                             </div>
                             <div>
                                 <p className="text-sm font-black text-white">Verified Venue</p>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed mt-1">CinemaConnect Standards</p>
                             </div>
                        </div>
                    </div>
                </div>
                
                <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 mt-8">
                    Get Directions <ExternalLink size={14} />
                </button>
          </div>
      </section>

      {}
      <section className="mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="flex items-center gap-10">
            <button 
              onClick={() => setActiveTab('SHOWTIMES')}
              className={`text-2xl font-black pb-3 transition-colors ${activeTab === 'SHOWTIMES' ? 'text-white border-b-4 border-accent-pink' : 'text-gray-500 hover:text-white'}`}
            >
              Movies & Showtimes
            </button>
            <button 
              onClick={() => setActiveTab('REVIEWS')}
              className={`text-2xl font-black pb-3 transition-colors ${activeTab === 'REVIEWS' ? 'text-white border-b-4 border-accent-pink' : 'text-gray-500 hover:text-white'}`}
            >
              Reviews ({reviews.length})
            </button>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 rounded-3xl p-2 border border-white/10">
            <div className="px-6 py-2.5 bg-accent-blue/20 text-accent-blue rounded-2xl text-xs font-black flex items-center gap-2">
              <Calendar size={14} /> SUN, 12 APR
            </div>
            <div className="px-6 py-2.5 hover:bg-white/5 rounded-2xl text-xs font-bold text-gray-400 transition-colors">MON, 13 APR</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'SHOWTIMES' ? (
            <motion.div 
              key="showtimes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {Object.keys(moviesWithShowtimes).length > 0 ? (
                Object.values(moviesWithShowtimes).map((movie: any) => (
                  <motion.div 
                    key={movie.id}
                    layout
                    className="bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 sm:p-12 hover:bg-surface/50 transition-all group overflow-hidden"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                      {}
                      <div className="lg:col-span-3 space-y-6">
                        <div className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                          <img src={movie.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={movie.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                            <Link to={`/movie/${movie.id}`} className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black uppercase text-white hover:bg-accent-pink transition-colors">View Details</Link>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black text-white leading-tight">{movie.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-black text-accent-blue py-1 px-2 bg-accent-blue/10 rounded uppercase">{movie.certification}</span>
                            {movie.genres?.[0] && (
                              <span className="text-[10px] font-black text-accent-pink py-1 px-2 bg-accent-pink/10 rounded uppercase">{movie.genres[0]}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {}
                      <div className="lg:col-span-9 space-y-10">
                        {Object.values(movie.screens).map((screen: any, idx: number) => (
                          <div key={screen.name} className={`space-y-6 ${idx !== 0 ? 'pt-8 border-t border-white/5' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-accent-blue border border-white/10">
                                  <Clock size={20} />
                                </div>
                                <div>
                                  <h4 className="font-black text-white uppercase tracking-wider">{screen.name}</h4>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{screen.format} Experience</p>
                                </div>
                              </div>
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
                <div className="text-center py-32 bg-white/5 rounded-[60px] border border-dashed border-white/10">
                  <p className="text-gray-500 font-black text-2xl italic opacity-50">No movies scheduled for today at this theatre.</p>
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center text-sm font-bold text-white">
                      {user?.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-white">How was your visit?</h4>
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
                      placeholder="Comment on seating, sound, or service..." 
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm outline-none focus:border-accent-blue transition-all h-32 resize-none"
                    />
                    <button 
                      type="submit"
                      className="absolute bottom-4 right-4 bg-accent-blue text-white p-3 rounded-xl hover:scale-110 active:scale-95 transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              )}

              {}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.length > 0 ? reviews.map((review) => (
                  <div key={review._id} className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 hover:bg-white/10 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-accent-blue/10 group-hover:border-accent-blue/20 transition-colors">
                          {review.userId?.name[0]}
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">{review.userId?.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                        <Star size={12} className="text-yellow-500" fill="currentColor" />
                        <span className="text-xs font-black text-yellow-500">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm italic leading-relaxed">"{review.comment}"</p>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                    <MessageSquare size={48} className="text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 font-black text-xl italic opacity-50">No one has reviewed this theatre yet.</p>
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
