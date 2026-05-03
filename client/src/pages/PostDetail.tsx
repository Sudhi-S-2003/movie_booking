import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { postsApi } from '../services/api/index.js';
import type { Post } from '../services/api/posts.api.js';
import { SEO } from '../components/common/SEO.js';
import { useAuthStore } from '../store/authStore.js';
import { PostContent } from '../components/post/index.js';
import { CommentSection } from '../components/post/CommentSection.js';

/* ───── Skeleton ─────────────────────────────────────────────── */
const Skeleton = () => (
  <div className="py-4 animate-pulse">
    <div className="lg:flex lg:gap-5">
      <div className="flex-1 space-y-4">
        <div className="h-4 w-16 bg-white/5 rounded-lg" />
        <div className="h-56 rounded-2xl bg-white/[0.03]" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/5" />
          <div className="space-y-1"><div className="h-3 w-24 bg-white/5 rounded" /><div className="h-2.5 w-14 bg-white/5 rounded" /></div>
        </div>
        <div className="space-y-2"><div className="h-3 w-full bg-white/5 rounded" /><div className="h-3 w-4/5 bg-white/5 rounded" /></div>
      </div>
      <div className="hidden lg:block flex-1 max-w-lg">
        <div className="h-[450px] rounded-2xl bg-white/[0.03]" />
      </div>
    </div>
  </div>
);

/* ───── Page ─────────────────────────────────────────────────── */
export const PostDetail = () => {
  const { postId } = useParams();
  const user = useAuthStore((s) => s.user);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theater, setTheater] = useState(false);


  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    postsApi
      .get(postId)
      .then((r) => !cancelled && setPost(r.post))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Post not found'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [postId]);

  const toggleLike = useCallback(async () => {
    if (!user || !post) return;
    const prev = post;
    setPost({ ...post, liked: !post.liked, likeCount: post.likeCount + (post.liked ? -1 : 1) });
    try { await postsApi.toggleLike(post._id); } catch { setPost(prev); }
  }, [user, post]);

  const toggleBookmark = useCallback(async () => {
    if (!user || !post) return;
    const prev = post;
    setPost({ ...post, bookmarked: !(post.bookmarked ?? false) });
    try { await postsApi.toggleBookmark(post._id); } catch { setPost(prev); }
  }, [user, post]);

  const handleCount = useCallback((d: number) => {
    setPost((p) => (p ? { ...p, commentCount: p.commentCount + d } : p));
  }, []);

  if (loading) return <Skeleton />;

  if (error || !post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <AlertCircle size={24} />
        </div>
        <h1 className="text-xl font-bold text-white">Post not found</h1>
        <p className="text-gray-500 text-sm">{error || 'This post may have been removed.'}</p>
        <Link to="/" className="mt-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
          Go home
        </Link>
      </div>
    );
  }

  const commentPanel = (
    <CommentSection
      postId={post._id}
      commentCount={post.commentCount}
      currentUserId={user?.id}
      isAdmin={user?.role === 'admin'}
      onCountChange={handleCount}
    />
  );

  const postPanel = (
    <PostContent
      post={post}
      canInteract={!!user}
      onLike={toggleLike}
      onBookmark={toggleBookmark}
      isTheaterMode={theater}
      onToggleTheater={() => setTheater(!theater)}
    />
  );

  /* ── Focus / Theater mode — centered stacked ── */
  if (theater) {
    return (
      <div className="max-w-3xl mx-auto py-4 pb-24 space-y-5">
        {postPanel}
        <div className="border-t border-white/[0.06]" />
        {commentPanel}
      </div>
    );
  }

  /* ── Default: side-by-side 50/50 on lg+ ── */
  return (
    <div className="py-4 pb-8">
      <SEO 
        title={post.title} 
        description={post.content.substring(0, 160)} 
        ogType="article"
      />
      {/* Desktop: two equal panels, edge-to-edge within parent */}
      <div className="hidden lg:flex lg:gap-5 lg:items-start">
        {/* Left — post (sticky, scrolls internally) */}
        <div className="flex-1 min-w-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
          {postPanel}
        </div>
        {/* Right — comments (sticky, fills remaining space) */}
        <div className="flex-1 min-w-0 sticky top-24 max-h-[calc(100vh-7rem)] flex flex-col">
          {commentPanel}
        </div>
      </div>

      {/* Mobile / Tablet: stacked */}
      <div className="lg:hidden space-y-5">
        {postPanel}
        <div className="border-t border-white/[0.06]" />
        {commentPanel}
      </div>
    </div>
  );
};

export default PostDetail;
