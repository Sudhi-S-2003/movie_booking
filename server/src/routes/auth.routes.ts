import { Router } from 'express';
import { register, login, logout, getMe, listSessions, revokeSession } from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', isAuthenticated, logout);
router.get('/logout', isAuthenticated, logout); // Keep GET for easy link logouts
router.get('/me', isAuthenticated, getMe);
router.get('/sessions', isAuthenticated, listSessions);
router.delete('/sessions/:id', isAuthenticated, revokeSession);

export default router;
