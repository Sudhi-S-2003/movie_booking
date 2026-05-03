import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Plus, Sparkles } from 'lucide-react';
import { usersApi, postsApi } from '../services/api/index.js';
import type {
  UserProfile,
  ProfileSummary,
  ProfileReview,
  ProfileWatchlistMovie,
  ActivityItem,
} from '../services/api/users.api.js';
import type { Post } from '../services/api/posts.api.js';
import { SEO } from '../components/common/SEO.js';
import { SITE_CONFIG } from '../config/site.config.js';
import { useAuthStore } from '../store/authStore.js';
import { PAGE_SIZE } from '../constants/pagination.js';
import {
  ProfileHero,
  ProfileStatsTabs,
  ProfilePostCard,
  PostComposer,
  UsersGrid,
  ReviewCard,
  WatchlistCard,
  BookmarkedPostCard,
  ActivityTimeline,
} from '../components/profile/index.js';
import type { ProfileTab } from '../components/profile/index.js';

const PostsSkeleton = () => (
  <div className="space-y-5">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 animate-pulse">
        <div className="h-5 w-2/3 bg-white/5 rounded mb-3" />
        <div className="h-3 w-full bg-white/5 rounded mb-2" />
        <div className="h-3 w-5/6 bg-white/5 rounded" />
      </div>
    ))}
  </div>
);

const EmptyPosts = ({
  tab,
  isSelf,
  onCompose,
}: {
  tab: ProfileTab;
  isSelf: boolean;
  onCompose: () => void;
}) => (
  <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center bg-white/[0.02]">
    <Sparkles size={32} className="mx-auto mb-4 text-gray-500" />
    <h3 className="text-white font-bold text-lg mb-2">
      {tab === 'likes' ? 'No liked posts yet' : tab === 'bookmarks' ? 'No bookmarks yet' : 'No posts yet'}
    </h3>
    <p className="text-gray-500 text-sm mb-6">
      {isSelf && tab === 'posts'
        ? 'Write your first review or thought.'
        : 'Check back later.'}
    </p>
    {isSelf && tab === 'posts' && (
      <button
        onClick={onCompose}
        className="px-6 py-3 rounded-2xl bg-accent-pink text-white text-sm font-bold inline-flex items-center gap-2"
      >
        <Plus size={14} /> Create post
      </button>
    )}
  </div>
);

export const UserDetails = () => {
  const { username } = useParams();
  const handle = username?.toLowerCase() ?? '';

  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<ProfileTab>('posts');

  // Post-list state (used by posts/likes/bookmarks)
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  const [followers, setFollowers] = useState<ProfileSummary[]>([]);
  const [following, setFollowing] = useState<ProfileSummary[]>([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [followersHasMore, setFollowersHasMore] = useState(true);
  const [followingHasMore, setFollowingHasMore] = useState(true);

  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsHasMore, setReviewsHasMore] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [watchlist, setWatchlist] = useState<ProfileWatchlistMovie[]>([]);
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [watchlistHasMore, setWatchlistHasMore] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Hydrate profile
  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    usersApi
      .getProfile(handle)
      .then((res) => {
        if (cancelled) return;
        setProfile(res.user);
        setIsSelf(res.isSelf);
        setIsFollowing(res.isFollowing);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Profile not found';
        setError(msg);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  // Load posts / likes / bookmarks
  useEffect(() => {
    if (!handle || !profile) return;
    if (tab !== 'posts' && tab !== 'likes' && tab !== 'bookmarks') return;
    let cancelled = false;
    setPostsLoading(true);
    setPosts([]);
    setPostsPage(1);
    setPostsHasMore(true);

    const loader =
      tab === 'likes'
        ? usersApi.getLikedPosts(handle, { page: 1, limit: PAGE_SIZE.POSTS })
        : tab === 'bookmarks'
          ? usersApi.getProfileBookmarks(handle, { page: 1, limit: PAGE_SIZE.BOOKMARKS })
          : usersApi.getProfilePosts(handle, { page: 1, limit: PAGE_SIZE.POSTS });

    loader
      .then((res) => {
        if (cancelled) return;
        setPosts(res.posts);
        setPostsHasMore(res.pagination.page < res.pagination.totalPages);
      })
      .finally(() => !cancelled && setPostsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [tab, handle, profile]);

  // Followers / following
  useEffect(() => {
    if (!handle || !profile) return;
    if (tab === 'followers') {
      usersApi.getFollowers(handle, { page: 1, limit: PAGE_SIZE.FOLLOWERS }).then((res) => {
        setFollowers(res.users);
        setFollowersPage(1);
        setFollowersHasMore(res.pagination.page < res.pagination.totalPages);
      });
    } else if (tab === 'following') {
      usersApi.getFollowing(handle, { page: 1, limit: PAGE_SIZE.FOLLOWERS }).then((res) => {
        setFollowing(res.users);
        setFollowingPage(1);
        setFollowingHasMore(res.pagination.page < res.pagination.totalPages);
      });
    }
  }, [tab, handle, profile]);

  // Reviews
  useEffect(() => {
    if (!handle || !profile || tab !== 'reviews') return;
    let cancelled = false;
    setReviewsLoading(true);
    setReviews([]);
    setReviewsPage(1);
    usersApi
      .getProfileReviews(handle, { page: 1, limit: PAGE_SIZE.REVIEWS })
      .then((res) => {
        if (cancelled) return;
        setReviews(res.reviews);
        setReviewsHasMore(res.pagination.page < res.pagination.totalPages);
      })
      .finally(() => !cancelled && setReviewsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, handle, profile]);

  // Watchlist
  useEffect(() => {
    if (!handle || !profile || tab !== 'watchlist') return;
    let cancelled = false;
    setWatchlistLoading(true);
    setWatchlist([]);
    setWatchlistPage(1);
    usersApi
      .getProfileWatchlist(handle, { page: 1, limit: PAGE_SIZE.WATCHLIST })
      .then((res) => {
        if (cancelled) return;
        setWatchlist(res.movies);
        setWatchlistHasMore(res.pagination.page < res.pagination.totalPages);
      })
      .finally(() => !cancelled && setWatchlistLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, handle, profile]);

  // Activity
  useEffect(() => {
    if (!handle || !profile || tab !== 'activity') return;
    let cancelled = false;
    setActivityLoading(true);
    usersApi
      .getProfileActivity(handle, { limit: PAGE_SIZE.ACTIVITY })
      .then((res) => {
        if (cancelled) return;
        setActivity(res.activity);
      })
      .finally(() => !cancelled && setActivityLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, handle, profile]);

  // Infinite scroll (posts + follower lists)
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMore = useCallback(async () => {
    if (postsLoading) return;
    if (tab === 'posts' || tab === 'likes' || tab === 'bookmarks') {
      if (!postsHasMore) return;
      setPostsLoading(true);
      const nextPage = postsPage + 1;
      const res =
        tab === 'likes'
          ? await usersApi.getLikedPosts(handle, { page: nextPage, limit: PAGE_SIZE.POSTS })
          : tab === 'bookmarks'
            ? await usersApi.getProfileBookmarks(handle, { page: nextPage, limit: PAGE_SIZE.BOOKMARKS })
            : await usersApi.getProfilePosts(handle, { page: nextPage, limit: PAGE_SIZE.POSTS });
      setPosts((prev) => [...prev, ...res.posts]);
      setPostsPage(nextPage);
      setPostsHasMore(res.pagination.page < res.pagination.totalPages);
      setPostsLoading(false);
    } else if (tab === 'followers') {
      if (!followersHasMore) return;
      const nextPage = followersPage + 1;
      const res = await usersApi.getFollowers(handle, { page: nextPage, limit: PAGE_SIZE.FOLLOWERS });
      setFollowers((prev) => [...prev, ...res.users]);
      setFollowersPage(nextPage);
      setFollowersHasMore(res.pagination.page < res.pagination.totalPages);
    } else if (tab === 'following') {
      if (!followingHasMore) return;
      const nextPage = followingPage + 1;
      const res = await usersApi.getFollowing(handle, { page: nextPage, limit: PAGE_SIZE.FOLLOWERS });
      setFollowing((prev) => [...prev, ...res.users]);
      setFollowingPage(nextPage);
      setFollowingHasMore(res.pagination.page < res.pagination.totalPages);
    }
  }, [tab, handle, postsPage, postsHasMore, postsLoading, followersPage, followersHasMore, followingPage, followingHasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const loadMoreReviews = async () => {
    if (reviewsLoading || !reviewsHasMore) return;
    setReviewsLoading(true);
    try {
      const nextPage = reviewsPage + 1;
      const res = await usersApi.getProfileReviews(handle, { page: nextPage, limit: PAGE_SIZE.REVIEWS });
      setReviews((prev) => [...prev, ...res.reviews]);
      setReviewsPage(nextPage);
      setReviewsHasMore(res.pagination.page < res.pagination.totalPages);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadMoreWatchlist = async () => {
    if (watchlistLoading || !watchlistHasMore) return;
    setWatchlistLoading(true);
    try {
      const nextPage = watchlistPage + 1;
      const res = await usersApi.getProfileWatchlist(handle, { page: nextPage, limit: PAGE_SIZE.WATCHLIST });
      setWatchlist((prev) => [...prev, ...res.movies]);
      setWatchlistPage(nextPage);
      setWatchlistHasMore(res.pagination.page < res.pagination.totalPages);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!currentUser || !profile) return;
    const res = await usersApi.toggleFollow(handle);
    setIsFollowing(res.following);
    setProfile((p) =>
      p
        ? {
            ...p,
            stats: p.stats
              ? {
                  ...p.stats,
                  followers: p.stats.followers + (res.following ? 1 : -1),
                }
              : undefined,
          }
        : p,
    );
  };

  const toggleLike = async (postId: string) => {
    if (!currentUser) return;
    const prev = posts;
    setPosts((ps) =>
      ps.map((p) =>
        p._id === postId
          ? { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }
          : p,
      ),
    );
    try {
      await postsApi.toggleLike(postId);
    } catch {
      setPosts(prev);
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!currentUser) return;
    const prev = posts;
    setPosts((ps) =>
      ps.map((p) =>
        p._id === postId ? { ...p, bookmarked: !(p.bookmarked ?? false) } : p,
      ),
    );
    try {
      await postsApi.toggleBookmark(postId);
    } catch {
      setPosts(prev);
    }
  };

  const removePost = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    await postsApi.remove(postId);
    setPosts((ps) => ps.filter((p) => p._id !== postId));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-accent-blue animate-pulse">
          Loading profile…
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-2xl font-black text-white">User not found</h1>
        <p className="text-gray-500 text-sm">No profile exists for @{username}.</p>
        <Link to="/" className="mt-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10">
          Back home
        </Link>
      </div>
    );
  }

  const canInteract = !!currentUser;

  return (
    <div className="pb-32">
      <SEO 
        title={username ? `@${username}` : 'Profile'} 
        description={`View ${username}'s profile, posts, and movie reviews on ${SITE_CONFIG.name}.`} 
      />
      <ProfileHero
        profile={profile}
        isSelf={isSelf}
        isFollowing={isFollowing}
        canFollow={canInteract}
        onEdit={() => navigate(`/user/${profile.username}/edit`)}
        onCompose={() => {
          setEditingPost(null);
          setComposerOpen(true);
        }}
        onToggleFollow={toggleFollow}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileStatsTabs stats={profile.stats} tab={tab} isSelf={isSelf} onTab={setTab} />
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <AnimatePresence mode="wait">
          {(tab === 'posts' || tab === 'likes') && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {postsLoading && posts.length === 0 ? (
                <PostsSkeleton />
              ) : posts.length === 0 ? (
                <EmptyPosts tab={tab} isSelf={isSelf} onCompose={() => setComposerOpen(true)} />
              ) : (
                <>
                  {posts.map((post) => (
                    <ProfilePostCard
                      key={post._id}
                      post={post}
                      isSelf={isSelf && tab === 'posts'}
                      canInteract={canInteract}
                      onLike={toggleLike}
                      onBookmark={toggleBookmark}
                      onEdit={(p) => {
                        setEditingPost(p);
                        setComposerOpen(true);
                      }}
                      onDelete={removePost}
                    />
                  ))}
                  {postsHasMore && <div ref={sentinelRef} className="h-20" />}
                  {postsLoading && <p className="text-center text-gray-500 text-sm">Loading…</p>}
                </>
              )}
            </motion.div>
          )}

          {tab === 'bookmarks' && (
            <motion.div
              key="bookmarks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {postsLoading && posts.length === 0 ? (
                <PostsSkeleton />
              ) : posts.length === 0 ? (
                <EmptyPosts tab={tab} isSelf={isSelf} onCompose={() => setComposerOpen(true)} />
              ) : (
                <>
                  {posts.map((post) => (
                    <BookmarkedPostCard
                      key={post._id}
                      post={post}
                      canInteract={canInteract}
                      onLike={toggleLike}
                      onBookmark={toggleBookmark}
                    />
                  ))}
                  {postsHasMore && <div ref={sentinelRef} className="h-20" />}
                </>
              )}
            </motion.div>
          )}

          {tab === 'followers' && (
            <UsersGrid
              key="followers"
              users={followers}
              hasMore={followersHasMore}
              sentinelRef={sentinelRef}
              emptyLabel="No followers yet"
            />
          )}

          {tab === 'following' && (
            <UsersGrid
              key="following"
              users={following}
              hasMore={followingHasMore}
              sentinelRef={sentinelRef}
              emptyLabel="Not following anyone yet"
            />
          )}

          {tab === 'reviews' && (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {reviewsLoading && reviews.length === 0 ? (
                <PostsSkeleton />
              ) : reviews.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center bg-white/[0.02]">
                  <Sparkles size={32} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-500 text-sm">No reviews yet.</p>
                </div>
              ) : (
                <>
                  {reviews.map((r) => (
                    <ReviewCard key={r._id} review={r} />
                  ))}
                  {reviewsHasMore && (
                    <div className="text-center">
                      <button
                        onClick={loadMoreReviews}
                        disabled={reviewsLoading}
                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        {reviewsLoading ? 'Loading…' : 'Load more reviews'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {tab === 'watchlist' && (
            <motion.div
              key="watchlist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {watchlistLoading && watchlist.length === 0 ? (
                <PostsSkeleton />
              ) : watchlist.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center bg-white/[0.02]">
                  <Sparkles size={32} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-500 text-sm">Watchlist is empty.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {watchlist.map((m) => (
                      <WatchlistCard key={m._id} movie={m} />
                    ))}
                  </div>
                  {watchlistHasMore && (
                    <div className="text-center">
                      <button
                        onClick={loadMoreWatchlist}
                        disabled={watchlistLoading}
                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        {watchlistLoading ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {tab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {activityLoading ? (
                <PostsSkeleton />
              ) : (
                <ActivityTimeline items={activity} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {composerOpen && (
          <PostComposer
            editing={editingPost}
            onClose={() => {
              setComposerOpen(false);
              setEditingPost(null);
            }}
            onSaved={(post, mode) => {
              if (mode === 'create') setPosts((prev) => [post, ...prev]);
              else setPosts((prev) => prev.map((p) => (p._id === post._id ? post : p)));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
