import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { ProfileSummary } from '../../services/api/users.api.js';

interface UsersGridProps {
  users:       ProfileSummary[];
  hasMore:     boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  emptyLabel:  string;
}

export const UsersGrid = ({ users, hasMore, sentinelRef, emptyLabel }: UsersGridProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
    {users.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center">
        <Users size={32} className="mx-auto mb-4 text-gray-500" />
        <p className="text-gray-500 text-sm">{emptyLabel}</p>
      </div>
    ) : (
      <>
        <div className="grid sm:grid-cols-2 gap-4">
          {users.map((u) => (
            <Link
              key={u._id}
              to={`/user/${u.username}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all"
            >
              {u.avatar ? (
                <img src={u.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center text-white font-black">
                  {u.name?.[0] ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
        {hasMore && <div ref={sentinelRef} className="h-20" />}
      </>
    )}
  </motion.div>
);
