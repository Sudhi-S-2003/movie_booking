import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, ArrowUp } from 'lucide-react';
import { postsApi } from '../../services/api/index.js';
import type { PostComment } from '../../services/api/posts.api.js';
import { CommentItem } from './CommentItem.js';

const COMMENTS_PER_PAGE = 20;

interface CommentSectionProps {
  postId: string;
  commentCount: number;
  currentUserId?: string;
  isAdmin: boolean;
  onCountChange: (delta: number) => void;
}

export const CommentSection = ({
  postId,
  commentCount,
  currentUserId,
  isAdmin,
  onCountChange,
}: CommentSectionProps) => {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Composer
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    postsApi
      .listComments(postId, { page: 1, limit: COMMENTS_PER_PAGE })
      .then((res) => {
        if (cancelled) return;
        setComments(res.comments);
        setPage(1);
        setHasMore(res.pagination.page < res.pagination.totalPages);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [postId]);

  // Auto-resize
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, [text]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await postsApi.listComments(postId, { page: next, limit: COMMENTS_PER_PAGE });
      setComments((p) => [...p, ...res.comments]);
      setPage(next);
      setHasMore(res.pagination.page < res.pagination.totalPages);
    } finally {
      setLoadingMore(false);
    }
  }, [postId, page, hasMore, loadingMore]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await postsApi.createComment(postId, { text: trimmed });
      setComments((p) => [{ ...res.comment, replyCount: 0, replies: [] }, ...p]);
      setText('');
      onCountChange(1);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleReplyCreated = (parentId: string, _reply: PostComment) => {
    setComments((p) =>
      p.map((c) => c._id === parentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c),
    );
    onCountChange(1);
  };

  const handleDelete = async (commentId: string) => {
    const wasTop = comments.some((c) => c._id === commentId);
    if (wasTop) {
      if (!confirm('Delete this comment and all its replies?')) return;
      const res = await postsApi.deleteComment(commentId);
      const n = (res as any).deletedCount ?? 1;
      setComments((p) => p.filter((c) => c._id !== commentId));
      onCountChange(-n);
    } else {
      setComments((p) =>
        p.map((c) => {
          const had = (c.replies ?? []).some((r) => r._id === commentId);
          return had ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) } : c;
        }),
      );
      onCountChange(-1);
    }
  };

  const handleLike = async (commentId: string) => {
    const res = await postsApi.likeComment(commentId);
    setComments((p) =>
      p.map((c) => c._id === commentId ? { ...c, liked: res.liked, likeCount: res.likeCount } : c),
    );
  };

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { root: scrollRef.current, rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const showSend = focused || text.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.07] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-accent-blue" />
          <span className="text-sm font-bold text-white">Comments</span>
          {commentCount > 0 && (
            <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-white/[0.06] text-[10px] font-bold text-gray-400 flex items-center justify-center">
              {commentCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <MessageCircle size={20} className="text-gray-700" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No comments yet</p>
            <p className="text-gray-600 text-xs mt-1">Start the conversation</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="divide-y divide-white/[0.04]">
              {comments.map((c) => (
                <CommentItem
                  key={c._id}
                  comment={c}
                  postId={postId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onLike={handleLike}
                  onDelete={handleDelete}
                  onReplyCreated={handleReplyCreated}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {hasMore && (
          <>
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-3">
                <div className="inline-flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      {currentUserId && (
        <div className="flex-shrink-0 border-t border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Write a comment..."
                rows={1}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2 text-[13px] text-white placeholder:text-gray-600 resize-none outline-none focus:border-accent-blue/30 focus:bg-white/[0.06] transition-all min-h-[36px] max-h-[100px] pr-10"
              />
              {/* Inline send button */}
              <motion.button
                initial={false}
                animate={{ scale: showSend ? 1 : 0, opacity: showSend ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                onClick={handleSubmit}
                disabled={!text.trim() || sending}
                className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-lg bg-accent-blue text-white flex items-center justify-center hover:bg-accent-blue/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowUp size={14} className={sending ? 'animate-pulse' : ''} />
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
