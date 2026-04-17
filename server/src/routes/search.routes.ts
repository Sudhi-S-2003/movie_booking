import { Router } from 'express';
import { unifiedSearch } from '../controllers/search.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuthenticate, unifiedSearch);

export default router;
