import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import {
  listMyKeys,
  createMyKey,
  revokeMyKey,
} from '../controllers/apiKey.controller.js';

const router = Router();

router.use(isAuthenticated);

router.get('/',           listMyKeys);
router.post('/',          createMyKey);
router.delete('/:id',     revokeMyKey);

export default router;
