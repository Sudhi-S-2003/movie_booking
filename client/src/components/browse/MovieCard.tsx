import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, BookmarkCheck, Play } from 'lucide-react';

const formatCount = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

interface MovieCardProps {
  movie: any;
}

export const MovieCard = ({ movie }: MovieCardProps) => (
  <motion.div whileHover={{ y: -10 }} className="group relative">
    <Link to={`/movie/${movie._id}`}>
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-[28px] overflow-hidden shadow-2xl border border-white/5">
        <img
          src={movie.posterUrl}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          alt={movie.title}
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
          <div className="w-full flex justify-between items-center text-white">
            <div className="flex gap-2">
              {movie.isWatchlisted && <BookmarkCheck size={15} className="text-accent-blue" />}
              {movie.isInterested && <Heart size={15} className="text-accent-pink" />}
            </div>
            <div className="w-8 h-8 rounded-full bg-accent-pink flex items-center justify-center">
              <Play size={11} fill="white" className="ml-0.5" />
            </div>
          </div>
        </div>

        {/* Rating/interest badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 z-10">
          {movie.showStatus === 'upcoming' ? (
            <>
              <Star size={11} className="text-accent-blue" fill="currentColor" />
              <span className="text-[10px] font-black text-white">
                {formatCount(movie.interestedUsers?.length || 0)}
              </span>
            </>
          ) : (
            <>
              <Star size={11} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black text-white">{movie.rating || 'N/A'}</span>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1 px-1">
        <h3 className="font-black text-white group-hover:text-accent-pink transition-colors truncate text-sm">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-accent-blue uppercase tracking-widest">
            {movie.certification}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">
            {movie.genres?.slice(0, 2).join(', ')}
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);
