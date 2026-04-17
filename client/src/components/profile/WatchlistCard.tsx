import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Star, Clock } from 'lucide-react';
import type { ProfileWatchlistMovie } from '../../services/api/users.api.js';

interface WatchlistCardProps {
  movie: ProfileWatchlistMovie;
}

export const WatchlistCard = ({ movie }: WatchlistCardProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <Link
      to={`/movie/${movie._id}`}
      className="block group rounded-2xl overflow-hidden bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all"
    >
      <div className="aspect-[2/3] overflow-hidden bg-white/5">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <Film size={32} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-white font-bold text-sm truncate group-hover:text-accent-pink transition-colors">
          {movie.title}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
          {typeof movie.rating === 'number' && (
            <span className="flex items-center gap-1">
              <Star size={10} className="text-accent-pink" fill="currentColor" />
              {movie.rating.toFixed(1)}
            </span>
          )}
          {typeof movie.duration === 'number' && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {movie.duration}m
            </span>
          )}
        </div>
      </div>
    </Link>
  </motion.div>
);
