import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Eye, Bookmark, ArrowRight } from 'lucide-react';
import type { Post } from '../../services/api/posts.api.js';
import { LinkifiedText } from '../ui/LinkifiedText.js';
import { timeAgo } from './utils.js';

interface PostCardProps {
  post:        Post;
  accent:      string;
  canInteract: boolean;
  onLike:      (id: string) => void;
  onBookmark:  (id: string) => void;
}

export const PostCard = ({ post, accent, canInteract, onLike, onBookmark }: PostCardProps) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden hover:border-white/20 transition-all"
  >
    {/* Clickable image area */}
    {post.imageUrl && (
      <Link to={`/post/${post._id}`} className="relative block h-56 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </Link>
    )}

    <div className="p-6">
      {/* Author row */}
      <Link
        to={post.author ? `/user/${post.author.username}` : '#'}
        className="flex items-center gap-3 mb-4 group/author"
      >
        {post.author?.avatar ? (
          <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
          >
            {post.author?.name?.[0] ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate group-hover/author:text-accent-pink transition-colors">
            {post.author?.name ?? 'Unknown'}
          </p>
          <p className="text-xs text-gray-500">
            @{post.author?.username ?? 'anon'} · {timeAgo(post.createdAt)}
          </p>
        </div>
      </Link>

      {/* Title — clickable */}
      <Link to={`/post/${post._id}`} className="block group/title">
        <h2 className="text-xl font-black text-white mb-2 leading-tight group-hover/title:text-accent-pink transition-colors">
          {post.title}
        </h2>
      </Link>

      {/* Excerpt */}
      <LinkifiedText className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap block">
        {post.excerpt ?? post.content}
      </LinkifiedText>

      {/* Read more */}
      <Link
        to={`/post/${post._id}`}
        className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-accent-blue hover:text-accent-blue/80 transition-colors"
      >
        Read more <ArrowRight size={12} />
      </Link>

      {/* Hashtag chips */}
      {post.hashtags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.hashtags.map((h) => (
            <Link
              key={h}
              to={`/hashtag/${h}`}
              className="text-xs font-bold text-accent-blue hover:underline"
            >
              #{h}
            </Link>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-6 text-gray-500">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center gap-2 text-sm font-bold transition-colors ${
            post.liked ? 'text-red-500' : 'hover:text-red-500'
          }`}
        >
          <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />
          {post.likeCount}
        </button>
        <Link to={`/post/${post._id}`} className="flex items-center gap-2 text-sm hover:text-accent-blue transition-colors">
          <MessageCircle size={16} /> {post.commentCount}
        </Link>
        <span className="flex items-center gap-2 text-sm">
          <Eye size={16} /> {post.viewCount}
        </span>
        {canInteract && (
          <button
            onClick={() => onBookmark(post._id)}
            className={`ml-auto flex items-center gap-2 text-sm font-bold transition-colors ${
              post.bookmarked ? 'text-accent-pink' : 'hover:text-accent-pink'
            }`}
            title={post.bookmarked ? 'Remove bookmark' : 'Save bookmark'}
          >
            <Bookmark size={16} fill={post.bookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </div>
  </motion.article>
);
