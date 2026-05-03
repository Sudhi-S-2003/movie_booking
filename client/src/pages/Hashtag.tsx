import { useState, useEffect, useSyncExternalStore, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { BellRing, Sparkles } from 'lucide-react';
import { hashtagsApi, postsApi } from '../services/api/index.js';
import type { Hashtag as HashtagT, RelatedHashtag } from '../services/api/hashtags.api.js';
import type { Post } from '../services/api/posts.api.js';
import { hashtagSocket } from '../services/socket/index.js';
import { SEO } from '../components/common/SEO.js';
import { useAuthStore } from '../store/authStore.js';
import { PAGE_SIZE } from '../constants/pagination.js';
import {
  HashtagHero,
  HashtagSortTabs,
  PostCard,
  HashtagSidebar,
  HashtagComposer,
  toSlug,
} from '../components/hashtag/index.js';
import type { SortMode } from '../components/hashtag/index.js';

const FeedSkeleton = () => (
  <div className="space-y-5">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 animate-pulse"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-white/5" />
          <div className="space-y-2">
            <div className="h-3 w-24 bg-white/5 rounded" />
            <div className="h-2 w-16 bg-white/5 rounded" />
          </div>
        </div>
        <div className="h-5 w-3/4 bg-white/5 rounded mb-3" />
        <div className="h-3 w-full bg-white/5 rounded mb-2" />
        <div className="h-3 w-5/6 bg-white/5 rounded" />
      </div>
    ))}
  </div>
);

const EmptyFeed = ({ accent }: { accent: string }) => (
  <div
    className="rounded-3xl border border-dashed border-white/10 py-16 text-center"
    style={{ backgroundColor: `${accent}08` }}
  >
    <Sparkles size={32} className="mx-auto mb-4 text-gray-500" />
    <h3 className="text-white font-bold text-lg mb-2">No posts yet</h3>
    <p className="text-gray-500 text-sm">Be the first to start this conversation.</p>
  </div>
);

export const Hashtag = () => {
  const { tag } = useParams();
  const slug = useMemo(() => toSlug(tag ?? ''), [tag]);

  const user = useAuthStore((s) => s.user);

  const [hashtag, setHashtag] = useState<HashtagT | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [related, setRelated] = useState<RelatedHashtag[]>([]);
  const [trending, setTrending] = useState<HashtagT[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<SortMode>('latest');
  const [composerOpen, setComposerOpen] = useState(false);

  const live = useSyncExternalStore(
    useCallback((l) => hashtagSocket.subscribe(l), []),
    () => hashtagSocket.getSnapshot(),
    () => hashtagSocket.getSnapshot(),
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setPosts([]);
    setPage(1);
    setHasMore(true);

    Promise.all([
      hashtagsApi.get(slug),
      hashtagsApi.related(slug, 8),
      hashtagsApi.trending(6),
      postsApi.listForHashtag(slug, { page: 1, limit: PAGE_SIZE.POSTS, sort }),
    ])
      .then(([hRes, relRes, trendRes, postsRes]) => {
        if (cancelled) return;
        setHashtag(hRes.hashtag);
        setIsFollowing(hRes.isFollowing);
        setRelated(relRes.related);
        setTrending(trendRes.hashtags);
        setPosts(postsRes.posts);
        setHasMore(postsRes.pagination.page < postsRes.pagination.totalPages);
      })
      .finally(() => !cancelled && setLoading(false));

    hashtagSocket.join(slug);
    return () => {
      cancelled = true;
      hashtagSocket.leave();
    };
  }, [slug, sort]);

  useEffect(() => {
    if (!Object.keys(live.likes).length) return;
    setPosts((prev) =>
      prev.map((p) => {
        const upd = live.likes[p._id];
        if (!upd) return p;
        return { ...p, likeCount: upd.likeCount };
      }),
    );
  }, [live.likes]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await postsApi.listForHashtag(slug, { page: page + 1, limit: PAGE_SIZE.POSTS, sort });
      setPosts((prev) => [...prev, ...res.posts]);
      setPage(page + 1);
      setHasMore(res.pagination.page < res.pagination.totalPages);
    } finally {
      setLoadingMore(false);
    }
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loadingMore, sort]);

  const revealNewPosts = () => {
    const drained = hashtagSocket.drainNewPosts();
    if (drained.length) setPosts((prev) => [...drained, ...prev]);
  };

  const toggleFollow = async () => {
    if (!user) return;
    const res = await hashtagsApi.follow(slug);
    setIsFollowing(res.following);
    setHashtag((h) =>
      h ? { ...h, followerCount: h.followerCount + (res.following ? 1 : -1) } : h,
    );
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const prev = posts;
    setPosts((p) =>
      p.map((post) =>
        post._id === postId
          ? {
              ...post,
              liked: !post.liked,
              likeCount: post.likeCount + (post.liked ? -1 : 1),
            }
          : post,
      ),
    );
    try {
      await postsApi.toggleLike(postId);
    } catch {
      setPosts(prev);
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    const prev = posts;
    setPosts((p) =>
      p.map((post) =>
        post._id === postId ? { ...post, bookmarked: !(post.bookmarked ?? false) } : post,
      ),
    );
    try {
      await postsApi.toggleBookmark(postId);
    } catch {
      setPosts(prev);
    }
  };

  const accent = hashtag?.color ?? '#6366f1';
  const canInteract = !!user;

  return (
    <div className="pb-32">
      <SEO 
        title={tag ? `#${tag}` : 'Hashtag'} 
        description={`Join the conversation about #${tag}. See latest posts and trending discussions.`} 
      />
      <HashtagHero
        hashtag={hashtag}
        fallbackTag={tag}
        isFollowing={isFollowing}
        canFollow={canInteract}
        viewers={live.viewers}
        onFollow={toggleFollow}
        onCompose={() => setComposerOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
        <main className="min-w-0 space-y-6">
          <HashtagSortTabs sort={sort} onSort={setSort} typing={live.typing} />

          <AnimatePresence>
            {live.newPosts.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={revealNewPosts}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-accent-pink/10 border border-accent-pink/30 text-accent-pink font-bold text-sm hover:bg-accent-pink/20 transition-colors"
              >
                <BellRing size={16} className="animate-pulse" />
                {live.newPosts.length} new {live.newPosts.length === 1 ? 'post' : 'posts'} — click to reveal
              </motion.button>
            )}
          </AnimatePresence>

          {loading ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <EmptyFeed accent={accent} />
          ) : (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={toggleLike}
                  onBookmark={toggleBookmark}
                  accent={accent}
                  canInteract={canInteract}
                />
              ))}
              {hasMore && <div ref={sentinelRef} className="h-20" />}
              {loadingMore && (
                <p className="text-center text-gray-500 text-sm">Loading more…</p>
              )}
            </div>
          )}
        </main>

        <HashtagSidebar related={related} trending={trending} />
      </div>

      <AnimatePresence>
        {composerOpen && (
          <HashtagComposer
            slug={slug}
            defaultHashtags={[slug]}
            onClose={() => setComposerOpen(false)}
            onCreated={(p) => setPosts((prev) => [p, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Hashtag;
