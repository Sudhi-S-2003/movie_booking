import { Router } from 'express';
import { createPaymentIntent, confirmPayment, getPaymentStatus } from '../controllers/payment.controller.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// All payment routes are protected
router.post('/create-intent', isAuthenticated, createPaymentIntent);
router.post('/confirm', isAuthenticated, confirmPayment);
router.get('/status/:id', isAuthenticated, getPaymentStatus);

export default router;
