import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  ArrowLeft,
  Share2,
  Calendar,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import type { Post } from '../../services/api/posts.api.js';
import { LinkifiedText } from '../ui/LinkifiedText.js';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

interface PostContentProps {
  post: Post;
  canInteract: boolean;
  onLike: () => void;
  onBookmark: () => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

export const PostContent = ({
  post,
  canInteract,
  onLike,
  onBookmark,
  isTheaterMode = false,
  onToggleTheater,
}: PostContentProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-gray-400 hover:text-white hover:bg-white/[0.08] font-semibold transition-all group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {onToggleTheater && (
          <button
            onClick={onToggleTheater}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            {isTheaterMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isTheaterMode ? 'Split' : 'Focus'}
          </button>
        )}
      </div>

      {/* Hero image */}
      {post.imageUrl && (
        <div className={`relative rounded-2xl overflow-hidden group ${isTheaterMode ? 'h-64 sm:h-80 md:h-[440px]' : 'h-44 sm:h-56 md:h-72 lg:h-64 xl:h-72'}`}>
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <h1 className={`font-black text-white leading-[1.15] drop-shadow-2xl ${isTheaterMode ? 'text-xl sm:text-2xl md:text-4xl' : 'text-lg sm:text-xl md:text-2xl'}`}>
              {post.title}
            </h1>
          </div>
        </div>
      )}

      {/* Title (no image) */}
      {!post.imageUrl && (
        <h1 className="text-xl sm:text-2xl font-black text-white leading-[1.15]">
          {post.title}
        </h1>
      )}

      {/* Author row */}
      <div className="flex items-center justify-between mt-4 mb-4">
        <Link
          to={post.author ? `/user/${post.author.username}` : '#'}
          className="flex items-center gap-2.5 group/a"
        >
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt=""
              className="w-9 h-9 rounded-full object-cover ring-[1.5px] ring-white/10 group-hover/a:ring-accent-pink/50 transition-all"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-pink flex items-center justify-center text-white font-black text-xs">
              {post.author?.name?.[0] ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white group-hover/a:text-accent-pink transition-colors truncate">
              {post.author?.name ?? 'Unknown'}
            </p>
            <p className="text-[11px] text-gray-500 truncate">@{post.author?.username ?? 'anon'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Calendar size={11} className="text-gray-600" />
            {formatDate(post.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={11} className="text-gray-600" />
            {formatNumber(post.viewCount)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <LinkifiedText className="text-gray-300/90 text-[13.5px] sm:text-sm leading-[1.8] whitespace-pre-wrap block">
          {post.content}
        </LinkifiedText>
      </div>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.hashtags.map((h) => (
            <Link
              key={h}
              to={`/hashtag/${h}`}
              className="px-2.5 py-0.5 rounded-lg bg-accent-blue/[0.08] text-[11px] font-semibold text-accent-blue hover:bg-accent-blue/[0.15] transition-colors"
            >
              #{h}
            </Link>
          ))}
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center gap-1 pt-3 border-t border-white/[0.06]">
        <button
          onClick={onLike}
          disabled={!canInteract}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
            post.liked
              ? 'bg-red-500/10 text-red-400'
              : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
          } disabled:opacity-30 disabled:pointer-events-none`}
        >
          <Heart size={14} fill={post.liked ? 'currentColor' : 'none'} />
          {formatNumber(post.likeCount)}
        </button>

        <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-gray-500">
          <MessageCircle size={14} />
          {formatNumber(post.commentCount)}
        </div>

        <div className="flex-1" />

        <button
          onClick={handleShare}
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
            copied
              ? 'bg-green-500/10 text-green-400'
              : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={copied ? 'Copied!' : 'Share'}
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
        </button>

        {canInteract && (
          <button
            onClick={onBookmark}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
              post.bookmarked
                ? 'bg-accent-pink/10 text-accent-pink'
                : 'text-gray-500 hover:text-accent-pink hover:bg-accent-pink/10'
            }`}
            title={post.bookmarked ? 'Saved' : 'Save'}
          >
            <Bookmark size={14} fill={post.bookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </motion.article>
  );
};
