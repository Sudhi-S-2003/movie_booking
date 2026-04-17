import { useSearchParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, MapPin, Star, ChevronRight, Play, Heart, BookmarkCheck } from 'lucide-react';
import { searchApi } from '../services/api/index.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  useDocumentTitle(query ? `Search: ${query}` : "Search");
  const [results, setResults] = useState<{ movies: any[], theatres: any[] }>({ movies: [], theatres: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    setLoading(true);
    searchApi.unified(query)
      .then(res => {
        setResults(res.results);
      })
      .catch(err => console.error('Search failed:', err))
      .finally(() => setLoading(false));
  }, [query]);

  const formatInterestCount = (count: number) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 px-4 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-white/5 rounded-2xl w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[2/3] bg-white/5 rounded-[40px]"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 max-w-7xl mx-auto space-y-20">
      
      {}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
          Search results for "<span className="text-accent-pink">{query}</span>"
        </h1>
        <p className="text-gray-400 font-medium text-lg">
          We found {results.movies.length} movies and {results.theatres.length} theatres matching your query.
        </p>
      </div>

      {}
      <AnimatePresence mode="wait">
        {results.movies.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                Movies <span className="text-sm bg-accent-pink/20 text-accent-pink px-3 py-1 rounded-full">{results.movies.length}</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {results.movies.map((movie) => (
                <motion.div
                  key={movie._id}
                  whileHover={{ y: -10 }}
                  className="group relative"
                >
                  <Link to={`/movie/${movie._id}`}>
                    <div className="relative aspect-[2/3] rounded-[32px] overflow-hidden shadow-2xl border border-white/5">
                      <img src={movie.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={movie.title} />
                      
                      {}
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

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {}
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
                      <h3 className="font-black text-white truncate group-hover:text-accent-pink transition-colors">{movie.title}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <span>{movie.certification}</span>
                        <span>•</span>
                        <span className="text-accent-blue">{movie.language}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence mode="wait">
        {results.theatres.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                Theatres <span className="text-sm bg-accent-blue/20 text-accent-blue px-3 py-1 rounded-full">{results.theatres.length}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.theatres.map((theatre) => (
                <motion.div
                  key={theatre._id}
                  whileHover={{ x: 10 }}
                  className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 flex items-center justify-between group hover:bg-white/10 transition-all"
                >
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white group-hover:text-accent-blue transition-colors">{theatre.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                      <MapPin size={14} className="text-accent-pink" />
                      {theatre.address}, {theatre.city}
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {}
      {!loading && results.movies.length === 0 && results.theatres.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
            <SearchIcon size={40} className="text-gray-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white italic opacity-50">No matches found...</h3>
            <p className="text-gray-500 font-medium">Try searching for something else, like "Batman" or "Mumbai"</p>
          </div>
          <Link to="/" className="text-accent-pink font-black hover:underline underline-offset-8">Go back home</Link>
        </div>
      )}

    </div>
  );
};
