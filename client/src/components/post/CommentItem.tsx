import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Reply, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { postsApi } from '../../services/api/index.js';
import type { PostComment } from '../../services/api/posts.api.js';
import { timeAgo } from '../hashtag/utils.js';
import { CommentComposer } from './CommentComposer.js';
import { Linkify } from './Linkify.js';

const REPLIES_PER_PAGE = 10;

interface CommentItemProps {
  comment: PostComment;
  postId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReplyCreated: (parentId: string, reply: PostComment) => void;
  depth?: number;
}

export const CommentItem = ({
  comment,
  postId,
  currentUserId,
  isAdmin,
  onLike,
  onDelete,
  onReplyCreated,
  depth = 0,
}: CommentItemProps) => {
  const [replies, setReplies] = useState<PostComment[]>(comment.replies ?? []);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesHasMore, setRepliesHasMore] = useState(true);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const replyCount = comment.replyCount ?? 0;
  const canDelete = currentUserId === comment.userId || isAdmin;
  const isLiked = comment.liked ?? false;

  const loadReplies = useCallback(async (pg: number) => {
    setLoadingReplies(true);
    try {
      const res = await postsApi.listReplies(comment._id, { page: pg, limit: REPLIES_PER_PAGE });
      setReplies(pg === 1 ? res.replies : (prev) => [...prev, ...res.replies]);
      setRepliesPage(pg);
      setRepliesHasMore(res.pagination.page < res.pagination.totalPages);
      setRepliesLoaded(true);
    } finally {
      setLoadingReplies(false);
    }
  }, [comment._id]);

  const toggleReplies = async () => {
    if (!showReplies && !repliesLoaded) await loadReplies(1);
    setShowReplies(!showReplies);
  };

  const handleReplySubmit = async (txt: string) => {
    const res = await postsApi.createComment(postId, { text: txt, parentId: comment._id });
    setReplies((p) => [...p, res.comment]);
    if (!showReplies) setShowReplies(true);
    setRepliesLoaded(true);
    setShowReplyInput(false);
    onReplyCreated(comment._id, res.comment);
  };

  const handleReplyLike = async (id: string) => {
    const res = await postsApi.likeComment(id);
    setReplies((p) => p.map((r) => r._id === id ? { ...r, liked: res.liked, likeCount: res.likeCount } : r));
  };

  const handleReplyDelete = async (id: string) => {
    if (!confirm('Delete this reply?')) return;
    await postsApi.deleteComment(id);
    setReplies((p) => p.filter((r) => r._id !== id));
    onDelete(id);
  };

  const initial = comment.user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={depth > 0 ? 'ml-9' : ''}
    >
      <div className="group flex gap-2.5 py-3">
        {/* Avatar */}
        <Link to={comment.user ? `/user/${comment.user.username}` : '#'} className="flex-shrink-0 mt-0.5">
          {comment.user?.avatar ? (
            <img src={comment.user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-[10px] font-bold text-white/80">
              {initial}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          {/* Name + time */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link
              to={comment.user ? `/user/${comment.user.username}` : '#'}
              className="text-[12.5px] font-semibold text-white hover:text-accent-pink transition-colors"
            >
              {comment.user?.name ?? 'Unknown'}
            </Link>
            <span className="text-[10.5px] text-gray-600">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Text */}
          <p className="text-gray-300 text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words mb-1.5">
            <Linkify text={comment.text} />
          </p>

          {/* Actions */}
          <div className="flex items-center gap-0.5 -ml-1.5">
            <button
              onClick={() => onLike(comment._id)}
              className={`flex items-center gap-1 h-6 px-1.5 rounded-md text-[11px] font-medium transition-colors ${
                isLiked ? 'text-red-400' : 'text-gray-600 hover:text-red-400'
              }`}
            >
              <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />
              {comment.likeCount > 0 && comment.likeCount}
            </button>

            {currentUserId && depth === 0 && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className={`flex items-center gap-1 h-6 px-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  showReplyInput ? 'text-accent-blue' : 'text-gray-600 hover:text-accent-blue'
                }`}
              >
                <Reply size={11} /> Reply
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete(comment._id)}
                className="h-6 px-1.5 rounded-md text-[11px] text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>

          {/* Inline reply input */}
          {showReplyInput && depth === 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <CommentComposer
                placeholder={`Reply to ${comment.user?.name ?? 'this comment'}...`}
                onSubmit={handleReplySubmit}
                onCancelReply={() => setShowReplyInput(false)}
                replyLabel={`@${comment.user?.username ?? 'anon'}`}
                autoFocus
                compact
              />
            </motion.div>
          )}

          {/* View replies */}
          {replyCount > 0 && depth === 0 && (
            <button
              onClick={toggleReplies}
              disabled={loadingReplies && !repliesLoaded}
              className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors disabled:opacity-50"
            >
              {loadingReplies && !repliesLoaded ? (
                <Loader2 size={12} className="animate-spin" />
              ) : showReplies ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              {showReplies ? 'Hide' : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.length > 0 && depth === 0 && (
        <div className="border-l border-white/[0.06] ml-3.5 pl-0.5">
          {replies.map((r) => (
            <CommentItem
              key={r._id}
              comment={r}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onLike={handleReplyLike}
              onDelete={handleReplyDelete}
              onReplyCreated={onReplyCreated}
              depth={1}
            />
          ))}

          {repliesHasMore && (
            <div className="ml-9 py-1">
              <button
                onClick={() => !loadingReplies && repliesHasMore && void loadReplies(repliesPage + 1)}
                disabled={loadingReplies}
                className="flex items-center gap-1 text-[11px] font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors disabled:opacity-50"
              >
                {loadingReplies ? <Loader2 size={11} className="animate-spin" /> : <ChevronDown size={11} />}
                More replies
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
