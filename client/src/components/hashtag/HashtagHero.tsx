import { motion } from 'framer-motion';
import { Hash, Users, Eye, Sparkles, Plus } from 'lucide-react';
import type { Hashtag } from '../../services/api/hashtags.api.js';

interface HashtagHeroProps {
  hashtag:     Hashtag | null;
  fallbackTag: string | undefined;
  isFollowing: boolean;
  canFollow:   boolean;
  viewers:     number;
  onFollow:    () => void;
  onCompose:   () => void;
}

const Stat = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-gray-500">{icon}</span>
    <span className="text-white font-bold">{value.toLocaleString()}</span>
    <span className="text-gray-500">{label}</span>
  </div>
);

export const HashtagHero = ({
  hashtag,
  fallbackTag,
  isFollowing,
  canFollow,
  viewers,
  onFollow,
  onCompose,
}: HashtagHeroProps) => {
  const accent = hashtag?.color ?? '#6366f1';

  return (
    <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${accent}55, transparent 60%), radial-gradient(circle at 80% 80%, ${accent}33, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end gap-8"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}55` }}
              >
                <Hash size={28} style={{ color: accent }} />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">
                Hashtag · Live Feed
              </span>
            </div>

            <h1 className="text-6xl sm:text-8xl font-black text-white leading-none tracking-tighter">
              #{hashtag?.name ?? fallbackTag}
            </h1>

            {hashtag?.description && (
              <p className="mt-4 text-lg text-gray-400 max-w-2xl">{hashtag.description}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm">
              <Stat icon={<Sparkles size={14} />} value={hashtag?.postCount ?? 0} label="posts" />
              <Stat icon={<Users size={14} />} value={hashtag?.followerCount ?? 0} label="followers" />
              <Stat icon={<Eye size={14} />} value={hashtag?.viewCount ?? 0} label="views" />
              {viewers > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 font-bold text-xs">{viewers} watching</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onFollow}
              disabled={!canFollow}
              className="px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                backgroundColor: isFollowing ? 'transparent' : accent,
                color: isFollowing ? accent : 'white',
                border: `2px solid ${accent}`,
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={onCompose}
              className="px-5 py-3 rounded-2xl font-bold text-sm uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Post
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
