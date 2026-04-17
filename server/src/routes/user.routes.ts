import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  toggleWatchlist,
  getWatchlist,
  checkWatchlistStatus,
  getAllUsers,
  getUserById,
} from '../controllers/user.controller.js';
import {
  getMe,
  updateMe,
  getProfile,
  getProfilePosts,
  getFollowers,
  getFollowing,
  toggleFollowUser,
  getLikedPosts,
  getFollowedHashtags,
  getProfileReviews,
  getProfileWatchlist,
  getProfileActivity,
} from '../controllers/profile.controller.js';
import { listBookmarks } from '../controllers/bookmark.controller.js';
import { isAuthenticated, isAdmin, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Current user
router.get('/me',    isAuthenticated as RequestHandler, getMe as RequestHandler);
router.patch('/me',  isAuthenticated as RequestHandler, updateMe as RequestHandler);

// Watchlist
router.post('/watchlist/:movieId',            isAuthenticated as RequestHandler, toggleWatchlist as RequestHandler);
router.get('/watchlist',                      isAuthenticated as RequestHandler, getWatchlist as RequestHandler);
router.get('/watchlist/:movieId/status',      isAuthenticated as RequestHandler, checkWatchlistStatus as RequestHandler);

// Admin
router.get('/all', isAuthenticated as RequestHandler, isAdmin as RequestHandler, getAllUsers as RequestHandler);

// Public profile (by username OR id)
router.get('/:handle/profile',   optionalAuthenticate as RequestHandler, getProfile as RequestHandler);
router.get('/:handle/posts',     optionalAuthenticate as RequestHandler, getProfilePosts as RequestHandler);
router.get('/:handle/likes',     optionalAuthenticate as RequestHandler, getLikedPosts as RequestHandler);
router.get('/:handle/followers', getFollowers as RequestHandler);
router.get('/:handle/following', getFollowing as RequestHandler);
router.get('/:handle/hashtags',  getFollowedHashtags as RequestHandler);
router.get('/:handle/reviews',   getProfileReviews as RequestHandler);
router.get('/:handle/watchlist-public', getProfileWatchlist as RequestHandler);
router.get('/:handle/activity',  optionalAuthenticate as RequestHandler, getProfileActivity as RequestHandler);
router.get('/:handle/bookmarks', isAuthenticated as RequestHandler, listBookmarks as RequestHandler);
router.post('/:handle/follow',   isAuthenticated as RequestHandler, toggleFollowUser as RequestHandler);

// Legacy by-id
router.get('/:id', optionalAuthenticate as RequestHandler, getUserById as RequestHandler);

export default router;
