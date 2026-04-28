import { Router } from 'express';
import type { RequestHandler } from 'express';
import { getPlatformStats, getAdminStats, getOwnerStats } from '../controllers/stats.controller.js';
import { isAuthenticated, isAdmin, isTheatreOwner } from '../middleware/auth.middleware.js';

const router = Router();

// Public landing page stats — cached and lightweight
router.get('/platform', getPlatformStats);

// Admin dashboard rollup
router.get(
  '/admin',
  isAuthenticated as RequestHandler,
  isAdmin as RequestHandler,
  getAdminStats as RequestHandler,
);

// Owner dashboard rollup
router.get(
  '/owner',
  isAuthenticated as RequestHandler,
  isTheatreOwner as RequestHandler,
  getOwnerStats as RequestHandler,
);

export default router;
