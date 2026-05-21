import { Router } from 'express';
import { getAvatar, getBadge, getImageOptions } from '../controllers/imageGenerator.controller.js';

const router = Router();

// Options route
router.get('/options', getImageOptions);

// Avatar routes
router.get('/avatar', getAvatar);
router.get('/avatar/:identifier', getAvatar);

// Badge routes
router.get('/badge', getBadge);
router.get('/badge/:identifier', getBadge);

export default router;
