import type { Request, Response } from 'express';
import { getErrorMessage } from '../utils/error.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import * as ProfileService from '../services/profile/profile.service.js';

// GET /api/users/me  — current user convenience endpoint
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const user = await ProfileService.getUserById(req.user._id);
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

    const user = await ProfileService.updateUserFields(req.user._id, patch);
    res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/profile — extended public profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const profileData = await ProfileService.getProfileData(user, req.user?._id, isAdmin);

    res.status(200).json({
      success: true,
      ...profileData,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/posts
export const getProfilePosts = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await ProfileService.findUserByHandle(handle);
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

    const { posts, total } = await ProfileService.getPostsByUser(user, req.user?._id, page.skip, page.limit, sort);

    res.status(200).json({
      success:    true,
      posts,
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
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req, 20);
    const { users, total } = await ProfileService.getUserFollowers(user._id, page.skip, page.limit);

    res.status(200).json({
      success:    true,
      users,
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
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req, 20);
    const { users, total } = await ProfileService.getUserFollowing(user._id, page.skip, page.limit);

    res.status(200).json({
      success:    true,
      users,
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
    const target = await ProfileService.findUserByHandle(handle);
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (target._id.toString() === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'Cannot follow yourself' });
      return;
    }

    const result = await ProfileService.toggleUserFollow(req.user._id, req.user.name || '', req.user.username || '', target);
    res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/likes — posts this user has liked
export const getLikedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const { posts, total } = await ProfileService.getUserLikedPosts(user, req.user?._id, page.skip, page.limit);

    res.status(200).json({
      success:    true,
      posts,
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
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const { reviews, total } = await ProfileService.getUserReviews(user._id, page.skip, page.limit);

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
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const { movies, total } = await ProfileService.getUserWatchlist(user._id, page.skip, page.limit);

    res.status(200).json({
      success:    true,
      movies,
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
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const limit = Math.min(30, Math.max(1, parseInt((req.query.limit as string) || '15', 10) || 15));
    const activity = await ProfileService.getUserActivity(user, req.user?._id, limit);

    res.status(200).json({ success: true, activity });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/bookmarks
export const getProfileBookmarksCount = async (req: AuthRequest, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!req.user?._id || req.user._id.toString() !== user._id.toString()) {
      res.status(200).json({ success: true, count: 0 });
      return;
    }
    const count = await ProfileService.getBookmarksCount(user._id);
    res.status(200).json({ success: true, count });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/users/:handle/hashtags — hashtags this user follows
export const getFollowedHashtags = async (req: Request, res: Response) => {
  try {
    const handle = String(req.params.handle ?? '');
    const user = await ProfileService.findUserByHandle(handle);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const page = parsePage(req);
    const { hashtags, total } = await ProfileService.getHashtagsFollowed(user._id, page.skip, page.limit);
    
    res.status(200).json({
      success: true,
      hashtags,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
