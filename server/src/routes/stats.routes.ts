import { Router } from 'express';
import type { RequestHandler } from 'express';
import { getPlatformStats, getAdminStats } from '../controllers/stats.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

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

export default router;
