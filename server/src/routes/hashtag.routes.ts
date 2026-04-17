import express from 'express';
import type { RequestHandler } from 'express';
import {
  getTrending,
  listHashtags,
  getHashtag,
  getRelatedHashtags,
  followHashtag,
  getHashtagStats,
} from '../controllers/hashtag.controller.js';
import { listPostsForHashtag } from '../controllers/post.controller.js';
import { isAuthenticated, optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/trending',           getTrending as RequestHandler);
router.get('/',                   listHashtags as RequestHandler);
router.get('/:slug',              optionalAuthenticate as RequestHandler, getHashtag as RequestHandler);
router.get('/:slug/stats',        getHashtagStats as RequestHandler);
router.get('/:slug/related',      getRelatedHashtags as RequestHandler);
router.get('/:slug/posts',        optionalAuthenticate as RequestHandler, listPostsForHashtag as RequestHandler);
router.post('/:slug/follow',      isAuthenticated as RequestHandler, followHashtag as RequestHandler);

export default router;
