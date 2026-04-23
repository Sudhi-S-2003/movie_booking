import { Router } from 'express';
import { 
  getIntegrations, 
  toggleIntegration 
} from '../controllers/integration.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

router.get('/', getIntegrations);
router.post('/:type/toggle', toggleIntegration);

export default router;
