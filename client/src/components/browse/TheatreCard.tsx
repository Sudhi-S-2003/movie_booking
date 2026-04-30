import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Tv, ChevronRight } from 'lucide-react';

interface TheatreCardProps {
  theatre: any;
}

export const TheatreCard = ({ theatre }: TheatreCardProps) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="group bg-surface/30 backdrop-blur-3xl border border-white/5 rounded-[56px] p-9 hover:bg-surface/50 transition-all flex flex-col justify-between"
  >
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue border border-accent-blue/20">
            <Tv size={19} />
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={10} className="text-yellow-500 fill-yellow-500" />
            ))}
          </div>
        </div>
        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-500">
          Premium Venue
        </span>
      </div>

      {/* Name + city */}
      <div className="space-y-1.5">
        <h3 className="text-3xl font-black text-white leading-tight group-hover:text-accent-blue transition-colors">
          {theatre.name}
        </h3>
        <div className="flex items-center gap-2 text-gray-500">
          <MapPin size={13} className="text-accent-pink" />
          <span className="text-xs font-bold uppercase tracking-widest">{theatre.city}</span>
        </div>
      </div>

      {/* Address */}
      <p className="text-sm text-gray-400 font-medium italic opacity-70 truncate">
        "{theatre.address}"
      </p>

      {/* Amenities */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
        {theatre.amenities?.slice(0, 3).map((item: string) => (
          <span
            key={item}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase text-gray-400"
          >
            {item}
          </span>
        ))}
        {theatre.amenities?.length > 3 && (
          <span className="px-3 py-1 text-[9px] font-bold uppercase text-accent-blue">
            +{theatre.amenities.length - 3} More
          </span>
        )}
      </div>
    </div>

    {/* CTA */}
    <Link
      to={`/theatre/${theatre._id}`}
      className="mt-8 flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-[28px] font-black uppercase tracking-widest text-[10px] hover:bg-accent-blue hover:text-white transition-all shadow-xl group/btn"
    >
      View <ChevronRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
    </Link>
  </motion.div>
);
