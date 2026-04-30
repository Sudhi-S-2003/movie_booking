import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Star, Sparkles, Navigation } from 'lucide-react';

interface Showtime {
  id: string;
  time: string;
}

interface Screen {
  name: string;
  format: string;
  times: Showtime[];
}

interface TheatreShowtimeCardProps {
  theatre: {
    id: string;
    name: string;
    city: string;
    address: string;
    screens: Record<string, Screen>;
  };
  currentMovieId?: string;
}

export const TheatreShowtimeCard: React.FC<TheatreShowtimeCardProps> = ({ theatre, currentMovieId }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative bg-surface/20 backdrop-blur-3xl border border-white/5 rounded-[48px] p-8 sm:p-12 hover:bg-surface/40 transition-all group overflow-hidden shadow-2xl"
    >
      {/* Accent Glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-blue/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

      <div className="relative z-10 space-y-12">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-white/5">
          <div className="flex gap-6">
            <div className="w-20 h-20 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center text-accent-blue shadow-inner group-hover:scale-110 transition-transform">
              <Sparkles size={32} className="fill-accent-blue/20" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{theatre.name}</h3>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-black text-yellow-500">4.8</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-gray-500">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-blue/70">
                  <MapPin size={12} /> {theatre.city} HUB
                </p>
                <div className="w-1 h-1 rounded-full bg-gray-800" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{theatre.address}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to={`/theatre/${theatre.id}${currentMovieId ? `?movieId=${currentMovieId}` : ''}`}
              className="px-8 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
            >
              Theatre Info
            </Link>
            <button className="p-3.5 bg-accent-blue text-white rounded-2xl hover:bg-accent-blue/80 transition-all shadow-lg shadow-accent-blue/20">
              <Navigation size={18} />
            </button>
          </div>
        </div>

        {/* Screens Section */}
        <div className="grid grid-cols-1 gap-12">
          {Object.values(theatre.screens).map((screen) => (
            <div key={screen.name} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-accent-pink border border-white/10">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white uppercase tracking-wider">{screen.name}</h4>
                  <p className="text-[10px] font-bold text-accent-pink bg-accent-pink/10 px-2 py-0.5 rounded-md border border-accent-pink/20 uppercase tracking-widest inline-block mt-1">{screen.format}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {screen.times.map((st) => (
                  <Link 
                    key={st.id}
                    to={`/booking/${st.id}`}
                    className="group/time relative px-10 py-5 bg-white/[0.03] border border-white/5 rounded-2xl text-base font-black text-accent-blue transition-all hover:bg-accent-blue hover:text-white hover:scale-105 hover:shadow-[0_15px_30px_rgba(59,130,246,0.3)] shadow-xl"
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
  );
};
