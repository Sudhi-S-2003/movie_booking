import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Star, Clock, Heart, BookmarkCheck, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { moviesApi } from '../services/api/index.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const GENRES = ['Action', 'Sci-Fi', 'Adventure', 'Drama', 'Crime', 'Fantasy', 'Animation', 'Romance', 'Thriller', 'Horror'];
const LANGUAGES = ['English', 'Hindi', 'Japanese', 'Spanish', 'French'];

export const Movies = () => {
  useDocumentTitle("Browse Movies");
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    genre: '',
    language: '',
    status: 'now_showing',
    search: ''
  });

  useEffect(() => {
    setLoading(true);
    moviesApi.list({
        genre: filters.genre,
        q: filters.search,
        status: filters.status
    })
      .then(res => setMovies(res.movies))
      .catch(err => console.error('Failed to fetch movies:', err))
      .finally(() => setLoading(false));
  }, [filters]);

  const formatInterestCount = (count: number) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  return (
    <div className="pb-32 space-y-12">
      {}
      <section className="relative h-[40vh] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-[60px] shadow-2xl flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-accent-blue/10 via-background to-accent-pink/10 z-0" />
          <div className="relative z-10 max-w-4xl w-full px-6 space-y-8 text-center">
              <motion.h1 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white"
              >
                Cinematic <span className="text-accent-pink">Explorer</span>
              </motion.h1>
              
              <div className="relative group max-w-2xl mx-auto">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-blue transition-colors" size={24} />
                <input 
                  type="text" 
                  placeholder="Search by title, actor, or director..." 
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-[30px] py-6 pl-16 pr-8 text-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all font-bold placeholder:text-gray-600"
                />
              </div>
          </div>
      </section>

      {}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between bg-surface/30 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px]">
              <div className="flex flex-wrap gap-4">
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent-pink transition-all"
                  >
                    <option value="now_showing" className="bg-background">Now Showing</option>
                    <option value="upcoming" className="bg-background">Coming Soon</option>
                    <option value="archived" className="bg-background">Classic Archive</option>
                  </select>

                  <select 
                    value={filters.genre}
                    onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent-blue transition-all"
                  >
                    <option value="" className="bg-background">All Genres</option>
                    {GENRES.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
                  </select>
              </div>

              <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Showing {movies.length} Results
                  </span>
                  <div className="h-4 w-px bg-white/10" />
                  <button className="text-accent-pink hover:text-white transition-colors">
                      <Filter size={20} />
                  </button>
              </div>
          </div>
      </section>

      {}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8"
            >
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </motion.div>
          ) : movies.length > 0 ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8"
            >
                {movies.map((movie) => (
                    <motion.div
                        key={movie._id}
                        whileHover={{ y: -10 }}
                        className="group relative"
                    >
                        <Link to={`/movie/${movie._id}`}>
                            <div className="relative aspect-[2/3] rounded-[32px] overflow-hidden shadow-2xl border border-white/5">
                                <img 
                                    src={movie.posterUrl} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                    alt={movie.title}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                    <div className="w-full flex justify-between items-center text-white">
                                        <div className="flex gap-2">
                                            {movie.isWatchlisted && <BookmarkCheck size={16} className="text-accent-blue" />}
                                            {movie.isInterested && <Heart size={16} className="text-accent-pink" />}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-accent-pink flex items-center justify-center">
                                            <Play size={12} fill="white" className="ml-0.5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 z-10">
                                    {movie.showStatus === 'upcoming' ? (
                                        <>
                                            <Star size={12} className="text-accent-blue" fill="currentColor" />
                                            <span className="text-[10px] font-black text-white">{formatInterestCount(movie.interestedUsers?.length || 0)}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                            <span className="text-[10px] font-black text-white">{movie.rating || 'N/A'}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 space-y-1 px-1">
                                <h3 className="font-black text-white group-hover:text-accent-pink transition-colors truncate text-sm">
                                    {movie.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-accent-blue uppercase tracking-widest">{movie.certification}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                        {movie.genres?.join(', ')}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
          ) : (
            <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32 bg-white/5 rounded-[60px] border border-dashed border-white/10"
            >
              <Search size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-black text-xl italic opacity-50">No movies match your filter parameters.</p>
              <button 
                onClick={() => setFilters({ genre: '', language: '', status: 'now_showing', search: '' })}
                className="mt-6 text-accent-blue font-black uppercase text-[10px] tracking-widest hover:underline"
              >
                Clear All Nodes
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
