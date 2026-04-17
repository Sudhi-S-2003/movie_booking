import { Sparkles } from 'lucide-react';

export type ProfileTab =
  | 'posts'
  | 'likes'
  | 'followers'
  | 'following'
  | 'reviews'
  | 'watchlist'
  | 'activity'
  | 'bookmarks';

interface Stats {
  bookings:  number;
  reviews:   number;
  watchlist: number;
  issues:    number;
  posts:     number;
  followers: number;
  following: number;
}

interface ProfileStatsTabsProps {
  stats:  Stats | undefined;
  tab:    ProfileTab;
  isSelf: boolean;
  onTab:  (tab: ProfileTab) => void;
}

const StatPill = ({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
      active
        ? 'bg-white text-black'
        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
    }`}
  >
    <span className="text-sm mr-1">{value.toLocaleString()}</span>
    {label}
  </button>
);

export const ProfileStatsTabs = ({ stats, tab, isSelf, onTab }: ProfileStatsTabsProps) => (
  <div className="mt-6 flex flex-wrap items-center gap-3">
    <StatPill label="posts"      value={stats?.posts     ?? 0} active={tab === 'posts'}     onClick={() => onTab('posts')} />
    <StatPill label="reviews"    value={stats?.reviews   ?? 0} active={tab === 'reviews'}   onClick={() => onTab('reviews')} />
    <StatPill label="watchlist"  value={stats?.watchlist ?? 0} active={tab === 'watchlist'} onClick={() => onTab('watchlist')} />
    <StatPill label="activity"   value={stats?.bookings  ?? 0} active={tab === 'activity'}  onClick={() => onTab('activity')} />
    <StatPill label="followers"  value={stats?.followers ?? 0} active={tab === 'followers'} onClick={() => onTab('followers')} />
    <StatPill label="following"  value={stats?.following ?? 0} active={tab === 'following'} onClick={() => onTab('following')} />
    <StatPill label="likes"      value={stats?.reviews   ?? 0} active={tab === 'likes'}     onClick={() => onTab('likes')} />
    {isSelf && (
      <StatPill label="bookmarks" value={0} active={tab === 'bookmarks'} onClick={() => onTab('bookmarks')} />
    )}
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-white/5 text-xs text-gray-500">
      <Sparkles size={12} /> {stats?.bookings ?? 0} bookings
    </div>
  </div>
);
