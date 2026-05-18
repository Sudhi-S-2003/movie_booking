import { Router } from 'express';
import { register, login, logout, getMe, listSessions, revokeSession, refresh, setup2FA, verify2FA, disable2FA, complete2FALogin } from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireTempToken } from '../middleware/twoFactor.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', isAuthenticated, logout);
router.get('/logout', isAuthenticated, logout); // Keep GET for easy link logouts
router.get('/me', isAuthenticated, getMe);
router.get('/sessions', isAuthenticated, listSessions);
router.delete('/sessions/:id', isAuthenticated, revokeSession);

router.post('/2fa/setup', isAuthenticated, setup2FA);
router.post('/2fa/verify', isAuthenticated, verify2FA);
router.post('/2fa/disable', isAuthenticated, disable2FA);
router.post('/2fa/complete-login', requireTempToken, complete2FALogin);

export default router;
