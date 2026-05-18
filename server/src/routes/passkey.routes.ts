import { Router } from 'express';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getMyPasskeys,
  deletePasskey
} from '../controllers/passkey.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// Registration flows (Protected)
router.get('/register/options', isAuthenticated, getRegistrationOptions);
router.post('/register/verify', isAuthenticated, verifyRegistration);

// Authentication flows (Public)
router.get('/login/options', getAuthenticationOptions);
router.post('/login/verify', verifyAuthentication);

// Passkey management flows (Protected)
router.get('/list', isAuthenticated, getMyPasskeys);
router.delete('/:id', isAuthenticated, deletePasskey);

export default router;
