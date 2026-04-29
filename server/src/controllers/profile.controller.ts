import type { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import { Post } from '../models/post.model.js';
import { PostLike } from '../models/postLike.model.js';
import { UserFollow } from '../models/userFollow.model.js';
import { Watchlist } from '../models/watchlist.model.js';
import { Review } from '../models/review.model.js';
import { SeatReservation } from '../models/seatReservation.model.js';
import { Issue } from '../models/issue.model.js';
import { HashtagFollow } from '../models/hashtagFollow.model.js';
import { Bookmark } from '../models/bookmark.model.js';
import { Movie } from '../models/movie.model.js';
import { Showtime } from '../models/showtime.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { enqueueNotification } from '../queues/notification.queue.js';

const findUserByHandle = async (handle: string) => {
  if (handle.match(/^[0-9a-fA-F]{24}$/)) {
    return User.findById(handle);
  }
  return User.findOne({ username: handle.toLowerCase() });
};

// GET /api/users/me  — current user convenience endpoint
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// PATCH /api/users/me
const EDITABLE_FIELDS = [
  'name',
  'bio',
  'avatar',
  'coverImageUrl',
  'location',
  'website',
  'pronouns',
  'phoneNumber',
  'socialLinks',
] as const;

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in body) patch[key] = body[key];
    }

    if (typeof patch.bio === 'string' && (patch.bio as string).length > 500) {
      res.status(400).json({ success: false, message: 'Bio must be 500 characters or fewer' });
      return;
    }

    const user = await User.findByIdAndUpdate(req.user._id, patch, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();

    res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/profile — extended public profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isSelf = req.user?._id?.toString() === user._id.toString();
    const isAdmin = req.user?.role === 'admin';

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
    if (req.user?._id && !isSelf) {
      const follow = await UserFollow.findOne({
        followerId: req.user._id,
        followingId: user._id,
      }).lean();
      isFollowing = !!follow;
    }

    const raw = user.toObject();
    const publicUser: Record<string, unknown> = { ...raw };
    delete publicUser.password;
    if (!isSelf && !isAdmin) {
      delete publicUser.email;
      delete publicUser.phoneNumber;
    }

    res.status(200).json({
      success: true,
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
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/posts
export const getProfilePosts = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const sortParam = (req.query.sort as string) || 'latest';
    const sort = sortParam === 'top'
      ? { likeCount: -1 as const, createdAt: -1 as const }
      : sortParam === 'most_commented'
        ? { commentCount: -1 as const, createdAt: -1 as const }
        : { pinned: -1 as const, createdAt: -1 as const };

    const [posts, total] = await Promise.all([
      Post.find({ authorId: user._id }).sort(sort).skip(page.skip).limit(page.limit).lean(),
      Post.countDocuments({ authorId: user._id }),
    ]);

    let likedSet = new Set<string>();
    if (req.user?._id && posts.length) {
      const likes = await PostLike.find({
        userId: req.user._id,
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

    res.status(200).json({
      success:    true,
      posts:      hydrated,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/followers
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req, 20);
    const [follows, total] = await Promise.all([
      UserFollow.find({ followingId: user._id })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .populate('followerId', 'name username avatar role')
        .lean(),
      UserFollow.countDocuments({ followingId: user._id }),
    ]);
    res.status(200).json({
      success:    true,
      users:      follows.map((f) => f.followerId),
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/following
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req, 20);
    const [follows, total] = await Promise.all([
      UserFollow.find({ followerId: user._id })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .populate('followingId', 'name username avatar role')
        .lean(),
      UserFollow.countDocuments({ followerId: user._id }),
    ]);
    res.status(200).json({
      success:    true,
      users:      follows.map((f) => f.followingId),
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// POST /api/users/:handle/follow — toggle follow
export const toggleFollowUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const handle = String(req.params.handle ?? '');
    const target = await findUserByHandle(handle);
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (target._id.toString() === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'Cannot follow yourself' });
      return;
    }

    const existing = await UserFollow.findOne({
      followerId: req.user._id,
      followingId: target._id,
    });

    if (existing) {
      await UserFollow.deleteOne({ _id: existing._id });
      await Promise.all([
        User.updateOne({ _id: target._id }, { $inc: { followerCount: -1 } }),
        User.updateOne({ _id: req.user._id }, { $inc: { followingCount: -1 } }),
      ]);
      res.status(200).json({ success: true, following: false });

      // Fire-and-forget lost-follower notification
      void enqueueNotification({
        type: 'lost_follower',
        targetUserId: String(target._id),
        unfollowerName: req.user.name || 'Someone',
      });
      return;
    }

    await UserFollow.create({
      followerId: req.user._id,
      followingId: target._id,
    });
    await Promise.all([
      User.updateOne({ _id: target._id }, { $inc: { followerCount: 1 } }),
      User.updateOne({ _id: req.user._id }, { $inc: { followingCount: 1 } }),
    ]);
    res.status(200).json({ success: true, following: true });

    // Fire-and-forget new-follower notification
    void enqueueNotification({
      type: 'new_follower',
      targetUserId: String(target._id),
      followerName: req.user.name || 'Someone',
      followerUsername: req.user.username || '',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/likes — posts this user has liked
export const getLikedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);

    const [likes, total] = await Promise.all([
      PostLike.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      PostLike.countDocuments({ userId: user._id }),
    ]);

    const postIds = likes.map((l) => l.postId);
    const posts = await Post.find({ _id: { $in: postIds } }).lean();
    const byId = new Map(posts.map((p) => [String(p._id), p]));

    // Hydrate authors
    const authorIds = [...new Set(posts.map((p) => String(p.authorId)))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select('name username avatar role')
      .lean();
    const authorById = new Map(authors.map((a) => [String(a._id), a]));

    let likedSet = new Set<string>();
    if (req.user?._id) {
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

    res.status(200).json({
      success:    true,
      posts:      ordered,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/reviews — paginated movie reviews by this user
export const getProfileReviews = async (req: Request, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const [rows, total] = await Promise.all([
      Review.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Review.countDocuments({ userId: user._id }),
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

    res.status(200).json({
      success:    true,
      reviews,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/watchlist — movies saved by user (public)
export const getProfileWatchlist = async (req: Request, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const [rows, total] = await Promise.all([
      Watchlist.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Watchlist.countDocuments({ userId: user._id }),
    ]);

    const movies = await Movie.find({ _id: { $in: rows.map((r) => r.movieId) } }).lean();
    const byId = new Map(movies.map((m) => [String(m._id), m]));
    const items = rows
      .map((r) => byId.get(String(r.movieId)))
      .filter((m): m is NonNullable<typeof m> => !!m);

    res.status(200).json({
      success:    true,
      movies:     items,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/activity — combined timeline (posts + reviews + bookings)
export const getProfileActivity = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isSelf = req.user?._id?.toString() === user._id.toString();
    const limit = Math.min(30, Math.max(1, parseInt((req.query.limit as string) || '15', 10) || 15));

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

    // Hydrate review + booking movies
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

    res.status(200).json({ success: true, activity: timeline });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/bookmarks — self-only; delegated via bookmark controller normally,
// but we also expose it here for completeness if needed in the future.
export const getProfileBookmarksCount = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!req.user?._id || req.user._id.toString() !== user._id.toString()) {
      res.status(200).json({ success: true, count: 0 });
      return;
    }
    const count = await Bookmark.countDocuments({ userId: user._id });
    res.status(200).json({ success: true, count });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/hashtags — hashtags this user follows
export const getFollowedHashtags = async (req: Request, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const filter = { userId: user._id };
    const [follows, total] = await Promise.all([
      HashtagFollow.find(filter)
        .populate('hashtagId')
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      HashtagFollow.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      hashtags: follows.map((f) => f.hashtagId).filter(Boolean),
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
