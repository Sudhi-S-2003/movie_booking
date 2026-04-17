import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Star, Ticket, Sparkles } from 'lucide-react';
import type { ActivityItem } from '../../services/api/users.api.js';
import { LinkifiedText } from '../ui/LinkifiedText.js';
import { timeAgo } from './utils.js';

interface ActivityTimelineProps {
  items: ActivityItem[];
}

const icon = (type: ActivityItem['type']) => {
  if (type === 'post')   return <FileText size={14} />;
  if (type === 'review') return <Star size={14} />;
  return <Ticket size={14} />;
};

const label = (type: ActivityItem['type']) => {
  if (type === 'post')   return 'Posted';
  if (type === 'review') return 'Reviewed';
  return 'Booked';
};

export const ActivityTimeline = ({ items }: ActivityTimelineProps) => {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center bg-white/[0.02]">
        <Sparkles size={32} className="mx-auto mb-4 text-gray-500" />
        <p className="text-gray-500 text-sm">No activity yet.</p>
      </div>
    );
  }

  return (
    <motion.ol
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-white/10"
    >
      {items.map((item, idx) => (
        <li key={`${item.type}-${idx}`} className="relative pl-12">
          <span className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-accent-blue">
            {icon(item.type)}
          </span>
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
              <span className="text-accent-pink">{label(item.type)}</span>
              <span>·</span>
              <span>{timeAgo(item.createdAt)}</span>
            </div>

            {item.type === 'post' && (
              <div className="mt-2">
                <h3 className="text-white font-bold text-sm">{item.data.title}</h3>
                <LinkifiedText className="mt-1 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap block line-clamp-3">
                  {item.data.excerpt ?? item.data.content}
                </LinkifiedText>
              </div>
            )}

            {item.type === 'review' && (
              <div className="mt-2">
                <Link
                  to={item.data.movie ? `/movie/${item.data.movie._id}` : '#'}
                  className="text-white font-bold text-sm hover:text-accent-pink transition-colors"
                >
                  {item.data.movie?.title ?? 'A movie'}{' '}
                  <span className="text-accent-pink">{item.data.rating.toFixed(1)}★</span>
                </Link>
                {item.data.comment && (
                  <LinkifiedText className="mt-1 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap block line-clamp-3">
                    {item.data.comment}
                  </LinkifiedText>
                )}
              </div>
            )}

            {item.type === 'booking' && (
              <div className="mt-2">
                <p className="text-white font-bold text-sm">
                  {item.data.movie?.title ?? 'Show'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Seat {item.data.seatId} · ₹{item.data.price} · {item.data.status}
                </p>
              </div>
            )}
          </div>
        </li>
      ))}
    </motion.ol>
  );
};
