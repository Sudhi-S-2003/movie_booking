import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Globe, Loader2} from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore.js';
import { theatresApi } from '../../services/api/theatres.api.js';

interface CitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ isOpen, onClose }) => {
  const { selectedCity, setCity } = useBookingStore();
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchCities = useCallback(async (searchQuery: string, pageNum: number, append: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await theatresApi.getCities({ q: searchQuery, page: pageNum, limit: 15 });
      setCities(prev => append ? [...prev, ...response.cities] : response.cities);
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchCities(citySearch, 1);
    }
  }, [isOpen, citySearch, fetchCities]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCities(citySearch, nextPage, true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85"
          />
          
          {/* Main Intelligence Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative w-full max-w-[450px] !bg-slate-950 border-l border-white/10 flex flex-col h-full shadow-[-30px_0_60px_rgba(0,0,0,0.9)] z-10 !opacity-100"
            style={{ backgroundColor: '#020617' }}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-white/5 relative bg-white/[0.02]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
                    Select <span className="text-accent-blue">Location</span>
                  </h2>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mt-1.5">Choose your city</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-blue transition-colors" size={16} />
                <input 
                  type="text"
                  placeholder="Search for your city..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-accent-blue/30 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              {/* All Locations Override */}
              {page === 1 && (!citySearch || 'all locations'.includes(citySearch.toLowerCase())) && (
                <div className="mb-8">
                  <button
                    onClick={() => {
                      setCity('');
                      onClose();
                    }}
                    className={`w-full p-7 rounded-[24px] border flex items-center gap-6 transition-all relative group overflow-hidden ${
                      !selectedCity
                        ? 'bg-accent-blue text-white border-transparent shadow-xl shadow-accent-blue/20'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      !selectedCity ? 'bg-white/20' : 'bg-white/5'
                    }`}>
                      <Globe size={28} />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">Global Access</p>
                      <p className="text-base font-black uppercase tracking-widest">All Locations</p>
                    </div>
                    {!selectedCity && (
                      <div className="ml-auto w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </button>

                  <div className="flex items-center gap-4 mt-8 mb-6">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Popular Cities</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                </div>
              )}

              {/* Cities Grid */}
              <div className="grid grid-cols-1 gap-4">
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => {
                      setCity(city);
                      onClose();
                    }}
                    className={`p-5 rounded-[20px] border flex items-center gap-5 transition-all group ${
                      selectedCity === city
                        ? 'bg-accent-blue/10 border-accent-blue text-accent-blue shadow-lg shadow-accent-blue/5'
                        : 'bg-white/[0.02] border-white/5 text-gray-500 hover:bg-white/5 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedCity === city ? 'bg-accent-blue/20' : 'bg-white/5'
                    }`}>
                      <MapPin size={22} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-[0.1em]">{city}</span>
                    {selectedCity === city && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-accent-blue" />
                    )}
                  </button>
                ))}
              </div>

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em]">Loading cities...</p>
                </div>
              )}

              {hasMore && !isLoading && (
                <button
                  onClick={loadMore}
                  className="w-full mt-8 py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] hover:bg-white/5 hover:text-white transition-all"
                >
                  Show More Cities
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 border-t border-white/5 bg-black/20 text-center">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">Cinema Connect Location Services</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
