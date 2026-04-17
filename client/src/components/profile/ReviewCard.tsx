import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Film } from 'lucide-react';
import type { ProfileReview } from '../../services/api/users.api.js';
import { LinkifiedText } from '../ui/LinkifiedText.js';
import { timeAgo } from './utils.js';

interface ReviewCardProps {
  review: ProfileReview;
}

const Stars = ({ rating }: { rating: number }) => {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= rounded ? 'text-accent-pink' : 'text-white/10'}
          fill={i <= rounded ? 'currentColor' : 'none'}
        />
      ))}
      <span className="ml-2 text-xs font-bold text-gray-400">{rating.toFixed(1)}</span>
    </div>
  );
};

export const ReviewCard = ({ review }: ReviewCardProps) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden hover:border-white/20 transition-all"
  >
    <div className="flex gap-4 p-5">
      <Link
        to={review.movie ? `/movie/${review.movie._id}` : '#'}
        className="block w-20 h-28 rounded-xl overflow-hidden bg-white/5 flex-shrink-0"
      >
        {review.movie?.posterUrl ? (
          <img src={review.movie.posterUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <Film size={24} />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={review.movie ? `/movie/${review.movie._id}` : '#'}
              className="text-base font-black text-white hover:text-accent-pink transition-colors block truncate"
            >
              {review.movie?.title ?? 'Unknown title'}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{timeAgo(review.createdAt)}</p>
          </div>
          <Stars rating={review.rating} />
        </div>

        {review.comment && (
          <LinkifiedText className="mt-3 text-sm text-gray-400 leading-relaxed whitespace-pre-wrap block">
            {review.comment}
          </LinkifiedText>
        )}

        {review.movie?.genres && review.movie.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {review.movie.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 py-0.5 rounded-full bg-white/5 border border-white/10"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </motion.article>
);
