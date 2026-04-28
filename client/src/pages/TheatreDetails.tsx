import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Info, Star, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { TagCloud } from '../components/ui/TagCloud.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

import { useTheatreDetails } from '../hooks/useTheatreDetails.js';
import { DateSelector } from '../components/ui/DateSelector.js';
import { ReviewSection } from '../components/ReviewSection.js';

export const TheatreDetails = () => {
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  
  const { 
    theatre, 
    moviesWithShowtimes, 
    loading 
  } = useTheatreDetails(id, selectedDate);

  const [activeTab, setActiveTab] = useState<'SHOWTIMES' | 'REVIEWS'>('SHOWTIMES');
  
  useDocumentTitle(theatre?.name || 'Loading Theatre...');


  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">Loading theatre details...</div>;
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
              <span className="px-4 py-1.5 bg-accent-blue/20 text-accent-blue rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">Verified Theatre</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => <Star key={star} size={10} className="text-yellow-500 fill-yellow-500" />)}
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
                    <h3 className="text-xl font-black uppercase tracking-tight">Theatre <span className="text-accent-blue">Amenities</span></h3>
                    <Info size={20} className="text-gray-600" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <TagCloud tags={theatre.amenities || []} variant="blue" />
                </div>
          </div>

          {}
          <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 rounded-[50px] p-10 flex flex-col justify-between">
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Contact Information</h3>
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
              Reviews
            </button>
          </div>
          
          {activeTab === 'REVIEWS' ? (
            <Link 
              to={`/theatre/${id}/reviews`}
              className="text-[10px] font-black text-accent-pink uppercase tracking-widest bg-accent-pink/10 px-6 py-2.5 rounded-xl border border-accent-pink/20 hover:bg-accent-pink/20 transition-all"
            >
              View All Reviews
            </Link>
          ) : (
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate} 
            />
          )}
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
            >
              <ReviewSection 
                targetId={id!} 
                targetType="Theatre" 
                targetName={theatre.name}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
