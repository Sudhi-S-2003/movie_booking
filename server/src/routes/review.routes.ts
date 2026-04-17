import { Router } from 'express';
import { createReview, getReviewsByTarget } from '../controllers/review.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', isAuthenticated, createReview);
router.get('/:targetId', getReviewsByTarget);

export default router;
