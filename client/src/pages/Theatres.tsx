import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Star, Info, Tv, ChevronRight, Navigation as NavIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theatresApi } from '../services/api/index.js';
import { useBookingStore } from '../store/bookingStore.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const popularCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

export const Theatres = () => {
  useDocumentTitle("Cinemas");
  const [theatres, setTheatres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedCity, setCity } = useBookingStore();

  useEffect(() => {
    setLoading(true);
    theatresApi.list({ city: selectedCity ?? undefined, q: searchQuery })
      .then(res => setTheatres(res.theatres))
      .catch(err => console.error('Failed to fetch theatres:', err))
      .finally(() => setLoading(false));
  }, [selectedCity, searchQuery]);

  return (
    <div className="pb-32 space-y-16">
      {}
      <section className="relative h-[50vh] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-[80px] shadow-2xl flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-accent-blue/5 backdrop-blur-3xl" />
          
          <div className="relative z-20 max-w-7xl mx-auto px-10 w-full grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                        <h1 className="text-6xl sm:text-8xl font-black uppercase tracking-tighter text-white leading-[0.85]">
                            Find <br />
                            <span className="text-accent-blue">Cinemas</span>
                        </h1>
                  </motion.div>
                  <p className="text-gray-400 font-medium max-w-sm italic">Find premium cinemas and boutique theaters near you.</p>
              </div>

              <div className="bg-surface/40 backdrop-blur-3xl border border-white/10 rounded-[48px] p-10 space-y-6 shadow-2xl">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Cities</h3>
                  <div className="flex flex-wrap gap-2">
                      {popularCities.map(city => (
                          <button
                            key={city}
                            onClick={() => setCity(city)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedCity === city 
                                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/30' 
                                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {city}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      </section>

      {}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 relative group w-full">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-blue transition-colors" size={24} />
                  <input 
                    type="text" 
                    placeholder="Search by theatre name or brand..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface/30 border border-white/5 rounded-[30px] py-6 pl-16 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all font-bold placeholder:text-gray-700"
                  />
              </div>
              <div className="flex items-center gap-4 bg-white/5 px-8 py-5 rounded-[30px] border border-white/5">
                  <NavIcon size={20} className="text-accent-pink" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{selectedCity} Cinemas</span>
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
               className="grid grid-cols-1 md:grid-cols-2 gap-8"
             >
               {[...Array(4)].map((_, i) => (
                 <div key={i} className="h-64 bg-white/5 rounded-[50px] animate-pulse" />
               ))}
             </motion.div>
          ) : theatres.length > 0 ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-10"
            >
                {theatres.map((theatre) => (
                    <motion.div
                        key={theatre._id}
                        whileHover={{ y: -5 }}
                        className="group bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[60px] p-10 hover:bg-surface/50 transition-all flex flex-col justify-between"
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue border border-accent-blue/20">
                                        <Tv size={20} />
                                    </span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className="text-yellow-500 fill-yellow-500" />)}
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-500">Premium Venue</span>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-4xl font-black text-white leading-tight group-hover:text-accent-blue transition-colors">{theatre.name}</h3>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <MapPin size={14} className="text-accent-pink" />
                                    <span className="text-xs font-bold uppercase tracking-widest">{theatre.city}</span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-400 font-medium italic opacity-70 truncate">"{theatre.address}"</p>

                            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                                {theatre.amenities?.slice(0, 3).map((item: string) => (
                                    <span key={item} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase text-gray-400">
                                        {item}
                                    </span>
                                ))}
                                {theatre.amenities?.length > 3 && (
                                    <span className="px-3 py-1 text-[9px] font-bold uppercase text-accent-blue">+{theatre.amenities.length - 3} More</span>
                                )}
                            </div>
                        </div>

                        <Link 
                            to={`/theatre/${theatre._id}`}
                            className="mt-10 flex items-center justify-center gap-2 py-5 bg-white/5 border border-white/10 rounded-[30px] font-black uppercase tracking-widest text-[10px] hover:bg-accent-blue hover:text-white transition-all shadow-xl group/btn"
                        >
                            View <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
          ) : (
            <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32 bg-white/5 rounded-[80px] border border-dashed border-white/10 flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700 mb-6">
                <Info size={36} />
              </div>
              <p className="text-gray-500 font-black text-2xl italic opacity-50">No cinemas found in {selectedCity}.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-8 text-accent-pink font-black uppercase text-[10px] tracking-widest hover:underline"
              >
                Reset
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
