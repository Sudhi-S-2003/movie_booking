import { Router } from 'express';
import { isAuthenticated, optionalAuthenticate } from '../middleware/auth.middleware.js';
import {
  getMySubscription,
  getPlans,
  checkout,
  enterpriseCheckout,
  enterpriseQuote,
  enterpriseRequest,
  confirm,
  cancel,
  getTransactions,
  getBillingHistory,
} from '../controllers/subscription.controller.js';

const router = Router();

router.get('/plans',              optionalAuthenticate, getPlans);

router.get('/',                        isAuthenticated, getMySubscription);
router.get('/transactions',            isAuthenticated, getTransactions);
router.get('/billing',                 isAuthenticated, getBillingHistory);
router.get('/enterprise/quote',        isAuthenticated, enterpriseQuote);
router.post('/enterprise/request',     isAuthenticated, enterpriseRequest);
router.post('/checkout',               isAuthenticated, checkout);
router.post('/enterprise/checkout',    isAuthenticated, enterpriseCheckout);
router.post('/confirm',                isAuthenticated, confirm);
router.post('/cancel',                 isAuthenticated, cancel);

export default router;
