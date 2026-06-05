import mongoose from 'mongoose';
import { User } from '../../models/user.model.js';
import { Post } from '../../models/post.model.js';
import { PostLike } from '../../models/postLike.model.js';
import { UserFollow } from '../../models/userFollow.model.js';
import { Watchlist } from '../../models/watchlist.model.js';
import { Review } from '../../models/review.model.js';
import { SeatReservation } from '../../models/seatReservation.model.js';
import { Issue } from '../../models/issue.model.js';
import { HashtagFollow } from '../../models/hashtagFollow.model.js';
import { Bookmark } from '../../models/bookmark.model.js';
import { Movie } from '../../models/movie.model.js';
import { Showtime } from '../../models/showtime.model.js';
import { enqueueNotification } from '../../queues/notification.queue.js';

export const findUserByHandle = async (handle: string) => {
  if (handle.match(/^[0-9a-fA-F]{24}$/)) {
    return User.findById(handle);
  }
  return User.findOne({ username: handle.toLowerCase() });
};

export const getUserById = async (userId: string | mongoose.Types.ObjectId) => {
  return User.findById(userId).lean();
};

export const updateUserFields = async (userId: string | mongoose.Types.ObjectId, patch: Record<string, unknown>) => {
  return User.findByIdAndUpdate(userId, patch, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
};

export const getProfileData = async (user: any, currentUserId?: string | mongoose.Types.ObjectId, isAdmin?: boolean) => {
  const isSelf = currentUserId?.toString() === user._id.toString();

  const [bookings, reviews, watchlistCount, issuesCount, postCount, followerCount, followingCount] =
    await Promise.all([
      SeatReservation.countDocuments({ userId: user._id, status: 'BOOKED' }),
      Review.countDocuments({ userId: user._id }),
      Watchlist.countDocuments({ userId: user._id }),
      Issue.countDocuments({ userId: user._id }),
      Post.countDocuments({ authorId: user._id }),
      UserFollow.countDocuments({ followingId: user._id }),
      UserFollow.countDocuments({ followerId: user._id }),
    ]);

  let isFollowing = false;
  if (currentUserId && !isSelf) {
    const follow = await UserFollow.findOne({
      followerId: currentUserId,
      followingId: user._id,
    }).lean();
    isFollowing = !!follow;
  }

  const raw = user.toObject ? user.toObject() : user;
  const publicUser: Record<string, unknown> = { ...raw };
  delete publicUser.password;
  if (!isSelf && !isAdmin) {
    delete publicUser.email;
    delete publicUser.phoneNumber;
  }

  return {
    user: {
      ...publicUser,
      stats: {
        bookings,
        reviews,
        watchlist: watchlistCount,
        issues: issuesCount,
        posts: postCount,
        followers: followerCount,
        following: followingCount,
      },
    },
    isSelf,
    isFollowing,
  };
};

export const getPostsByUser = async (user: any, currentUserId: string | mongoose.Types.ObjectId | undefined, skip: number, limit: number, sort: any) => {
  const [posts, total] = await Promise.all([
    Post.find({ authorId: user._id }).sort(sort).skip(skip).limit(limit).lean(),
    Post.countDocuments({ authorId: user._id }),
  ]);

  let likedSet = new Set<string>();
  if (currentUserId && posts.length) {
    const likes = await PostLike.find({
      userId: currentUserId,
      postId: { $in: posts.map((p) => p._id) },
    }).lean();
    likedSet = new Set(likes.map((l) => String(l.postId)));
  }

  const author = {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
  };
  const hydrated = posts.map((p) => ({
    ...p,
    author,
    liked: likedSet.has(String(p._id)),
  }));

  return { posts: hydrated, total };
};

export const getUserFollowers = async (userId: string | mongoose.Types.ObjectId, skip: number, limit: number) => {
  const [follows, total] = await Promise.all([
    UserFollow.find({ followingId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('followerId', 'name username avatar role')
      .lean(),
    UserFollow.countDocuments({ followingId: userId }),
  ]);
  return { users: follows.map((f) => f.followerId), total };
};

export const getUserFollowing = async (userId: string | mongoose.Types.ObjectId, skip: number, limit: number) => {
  const [follows, total] = await Promise.all([
    UserFollow.find({ followerId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('followingId', 'name username avatar role')
      .lean(),
    UserFollow.countDocuments({ followerId: userId }),
  ]);
  return { users: follows.map((f) => f.followingId), total };
};

export const toggleUserFollow = async (currentUserId: string | mongoose.Types.ObjectId, currentUserName: string, currentUserUsername: string, targetUser: any) => {
  const existing = await UserFollow.findOne({
    followerId: currentUserId,
    followingId: targetUser._id,
  });

  if (existing) {
    await UserFollow.deleteOne({ _id: existing._id });
    await Promise.all([
      User.updateOne({ _id: targetUser._id }, { $inc: { followerCount: -1 } }),
      User.updateOne({ _id: currentUserId }, { $inc: { followingCount: -1 } }),
    ]);

    // Fire-and-forget lost-follower notification
    void enqueueNotification({
      type: 'lost_follower',
      targetUserId: String(targetUser._id),
      unfollowerName: currentUserName || 'Someone',
    });
    return { following: false };
  }

  await UserFollow.create({
    followerId: currentUserId,
    followingId: targetUser._id,
  });
  await Promise.all([
    User.updateOne({ _id: targetUser._id }, { $inc: { followerCount: 1 } }),
    User.updateOne({ _id: currentUserId }, { $inc: { followingCount: 1 } }),
  ]);

  // Fire-and-forget new-follower notification
  void enqueueNotification({
    type: 'new_follower',
    targetUserId: String(targetUser._id),
    followerName: currentUserName || 'Someone',
    followerUsername: currentUserUsername || '',
  });

  return { following: true };
};

export const getUserLikedPosts = async (user: any, currentUserId: string | mongoose.Types.ObjectId | undefined, skip: number, limit: number) => {
  const [likes, total] = await Promise.all([
    PostLike.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PostLike.countDocuments({ userId: user._id }),
  ]);

  const postIds = likes.map((l) => l.postId);
  const posts = await Post.find({ _id: { $in: postIds } }).lean();
  const byId = new Map(posts.map((p) => [String(p._id), p]));

  const authorIds = [...new Set(posts.map((p) => String(p.authorId)))];
  const authors = await User.find({ _id: { $in: authorIds } })
    .select('name username avatar role')
    .lean();
  const authorById = new Map(authors.map((a) => [String(a._id), a]));

  let likedSet = new Set<string>();
  if (currentUserId) {
    likedSet = new Set(postIds.map(String));
  }

  const ordered = likes
    .map((l) => {
      const p = byId.get(String(l.postId));
      if (!p) return null;
      return {
        ...p,
        author: authorById.get(String(p.authorId)) ?? null,
        liked: likedSet.has(String(p._id)),
      };
    })
    .filter(Boolean);

  return { posts: ordered, total };
};

export const getUserReviews = async (userId: string | mongoose.Types.ObjectId, skip: number, limit: number) => {
  const [rows, total] = await Promise.all([
    Review.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ userId }),
  ]);

  const movieIds = rows.map((r) => r.targetId).filter(Boolean);
  const movies = await Movie.find({ _id: { $in: movieIds } })
    .select('title posterUrl backdropUrl genres language')
    .lean();
  const movieMap = new Map(movies.map((m) => [String(m._id), m]));

  const reviews = rows.map((r) => ({
    ...r,
    movie: movieMap.get(String(r.targetId)) ?? null,
  }));

  return { reviews, total };
};

export const getUserWatchlist = async (userId: string | mongoose.Types.ObjectId, skip: number, limit: number) => {
  const [rows, total] = await Promise.all([
    Watchlist.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Watchlist.countDocuments({ userId }),
  ]);

  const movies = await Movie.find({ _id: { $in: rows.map((r) => r.movieId) } }).lean();
  const byId = new Map(movies.map((m) => [String(m._id), m]));
  const items = rows
    .map((r) => byId.get(String(r.movieId)))
    .filter((m): m is NonNullable<typeof m> => !!m);

  return { movies: items, total };
};

export const getUserActivity = async (user: any, currentUserId: string | mongoose.Types.ObjectId | undefined, limit: number) => {
  const isSelf = currentUserId?.toString() === user._id.toString();

  const [posts, reviews, bookingsRaw] = await Promise.all([
    Post.find({ authorId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title excerpt imageUrl hashtags createdAt likeCount commentCount')
      .lean(),
    Review.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    // Bookings are private — only include when viewing your own profile
    isSelf
      ? SeatReservation.find({ userId: user._id, status: 'BOOKED' })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()
      : Promise.resolve([] as any[]),
  ]);

  const reviewMovieIds = reviews.map((r) => r.targetId).filter(Boolean);
  const showtimeIds = bookingsRaw.map((b) => b.showtimeId);
  const [reviewMovies, showtimes] = await Promise.all([
    Movie.find({ _id: { $in: reviewMovieIds } }).select('title posterUrl').lean(),
    Showtime.find({ _id: { $in: showtimeIds } }).lean(),
  ]);
  const reviewMovieMap = new Map(reviewMovies.map((m) => [String(m._id), m]));
  const showtimeMap = new Map(showtimes.map((s) => [String(s._id), s]));

  const bookingMovieIds = showtimes.map((s) => s.movieId).filter(Boolean);
  const bookingMovies = await Movie.find({ _id: { $in: bookingMovieIds } })
    .select('title posterUrl')
    .lean();
  const bookingMovieMap = new Map(bookingMovies.map((m) => [String(m._id), m]));

  const timeline = [
    ...posts.map((p) => ({
      type: 'post' as const,
      createdAt: p.createdAt,
      data: p,
    })),
    ...reviews.map((r) => ({
      type: 'review' as const,
      createdAt: r.createdAt,
      data: { ...r, movie: reviewMovieMap.get(String(r.targetId)) ?? null },
    })),
    ...bookingsRaw.map((b) => {
      const showtime = showtimeMap.get(String(b.showtimeId));
      const movie = showtime ? bookingMovieMap.get(String(showtime.movieId)) : null;
      return {
        type: 'booking' as const,
        createdAt: b.createdAt,
        data: { ...b, showtime: showtime ?? null, movie },
      };
    }),
  ].sort(
    (a, b) =>
      new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime(),
  ).slice(0, limit);

  return timeline;
};

export const getBookmarksCount = async (userId: string | mongoose.Types.ObjectId) => {
  return Bookmark.countDocuments({ userId });
};

export const getHashtagsFollowed = async (userId: string | mongoose.Types.ObjectId, skip: number, limit: number) => {
  const filter = { userId };
  const [follows, total] = await Promise.all([
    HashtagFollow.find(filter)
      .populate('hashtagId')
      .skip(skip)
      .limit(limit)
      .lean(),
    HashtagFollow.countDocuments(filter),
  ]);
  return { hashtags: follows.map((f) => f.hashtagId).filter(Boolean), total };
};
