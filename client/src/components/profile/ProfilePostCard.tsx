import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Eye,
  Edit3,
  Trash2,
  Bookmark,
  ArrowRight,
} from 'lucide-react';
import type { Post } from '../../services/api/posts.api.js';
import { LinkifiedText } from '../ui/LinkifiedText.js';
import { timeAgo } from './utils.js';

interface ProfilePostCardProps {
  post:          Post;
  isSelf:        boolean;
  canInteract:   boolean;
  onLike:        (id: string) => void;
  onBookmark:    (id: string) => void;
  onEdit?:       (p: Post) => void;
  onDelete?:     (id: string) => void;
}

export const ProfilePostCard = ({
  post,
  isSelf,
  canInteract,
  onLike,
  onBookmark,
  onEdit,
  onDelete,
}: ProfilePostCardProps) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden hover:border-white/20 transition-all"
  >
    {/* Clickable image */}
    {post.imageUrl && (
      <Link to={`/post/${post._id}`} className="block h-56 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
        />
      </Link>
    )}
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <Link to={`/post/${post._id}`} className="group/title block">
            <h2 className="text-xl font-black text-white leading-tight group-hover/title:text-accent-pink transition-colors">
              {post.title}
            </h2>
          </Link>
          <p className="text-xs text-gray-500 mt-1">{timeAgo(post.createdAt)}</p>
        </div>
        {isSelf && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit?.(post)}
              className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5"
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => onDelete?.(post._id)}
              className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

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

      {post.hashtags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.hashtags.map((h) => (
            <Link key={h} to={`/hashtag/${h}`} className="text-xs font-bold text-accent-blue hover:underline">
              #{h}
            </Link>
          ))}
        </div>
      )}

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
