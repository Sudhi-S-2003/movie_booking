import { Router } from 'express';
import { getUrlPreview } from '../controllers/urlPreview.controller.js';
// import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// We require authentication for previews as it's typically used within
// the chat/app context and prevents anonymous scrapers from using our server.
router.get('/', getUrlPreview);

export default router;
