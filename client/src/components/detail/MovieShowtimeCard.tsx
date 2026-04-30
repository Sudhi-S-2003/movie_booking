import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Info, ShieldCheck, Zap } from 'lucide-react';

interface Showtime {
  id: string;
  time: string;
}

interface Screen {
  name: string;
  format: string;
  times: Showtime[];
}

interface MovieShowtimeCardProps {
  movie: {
    id: string;
    title: string;
    posterUrl: string;
    certification: string;
    genres: string[];
    screens: Record<string, Screen>;
  };
}

export const MovieShowtimeCard: React.FC<MovieShowtimeCardProps> = ({ movie }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-surface/20 backdrop-blur-3xl border border-white/5 rounded-[48px] p-6 sm:p-10 hover:bg-surface/40 transition-all group overflow-hidden shadow-2xl"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-pink/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14">
        {/* Left: Poster & Info */}
        <div className="lg:col-span-3 space-y-8">
          <div className="relative aspect-[2/3] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group/poster">
            <img 
              src={movie.posterUrl} 
              className="w-full h-full object-cover group-hover/poster:scale-110 transition-transform duration-700 ease-out" 
              alt={movie.title} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
            <div className="absolute inset-0 flex items-end p-6 translate-y-4 group-hover/poster:translate-y-0 opacity-0 group-hover/poster:opacity-100 transition-all duration-300">
              <Link 
                to={`/movie/${movie.id}`} 
                className="w-full py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-accent-pink hover:border-accent-pink transition-all text-center"
              >
                View Details
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-3xl font-black text-white leading-none tracking-tighter">{movie.title}</h3>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
                <ShieldCheck size={10} className="text-accent-blue" />
                <span className="text-[10px] font-black text-accent-blue uppercase">{movie.certification}</span>
              </div>
              {movie.genres?.slice(0, 2).map(genre => (
                <div key={genre} className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{genre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Screens & Times */}
        <div className="lg:col-span-9 space-y-10">
          <div className="flex items-center gap-4 text-gray-500 mb-2">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Available Screens</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="space-y-12">
            {Object.values(movie.screens).map((screen, idx) => (
              <div key={screen.name} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-accent-blue border border-white/10 shadow-inner group-hover:bg-accent-blue/10 transition-colors">
                      <Zap size={24} className="fill-accent-blue/20" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-wider">{screen.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-accent-pink bg-accent-pink/10 px-2 py-0.5 rounded-md border border-accent-pink/20 uppercase tracking-widest">{screen.format}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-700" />
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Premium Audio & Visuals</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-gray-600">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pricing Varies</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {screen.times.map((st) => (
                    <Link 
                      key={st.id}
                      to={`/booking/${st.id}`}
                      className="group/time relative flex flex-col items-center justify-center py-5 bg-white/[0.03] border border-white/5 rounded-2xl transition-all hover:bg-accent-blue hover:border-accent-blue hover:scale-105 hover:shadow-[0_15px_30px_rgba(59,130,246,0.3)]"
                    >
                      <Clock size={12} className="text-gray-500 mb-1 group-hover/time:text-white/60" />
                      <span className="text-base font-black text-white group-hover/time:scale-110 transition-transform">{st.time}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
