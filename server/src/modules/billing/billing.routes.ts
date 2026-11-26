import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { requirePermission, requireRole } from '../access/access.middleware.js';
import { Permission } from '../access/access.constants.js';
import { UserRole } from '../../constants/enums.js';
import * as C from './billing.controller.js';

/** /api/billing */
export const billingRouter = Router();
billingRouter.use(isAuthenticated);

// Own account
billingRouter.get('/summary', C.mySummary);
billingRouter.get('/ledger', C.myLedger);
billingRouter.get('/usage', C.myUsage);
billingRouter.get('/quote', C.quote);

// Invoices
billingRouter.get('/invoices', C.listInvoices);
billingRouter.post('/invoices/:id/pay', C.payInvoice);
billingRouter.post('/cycles/run', requirePermission(Permission.BILLING_MANAGE), C.runBillingCycle);

// Wallet operations
billingRouter.post('/transfers', requirePermission(Permission.WALLET_TRANSFER), C.transfer);
billingRouter.post('/topups', requirePermission(Permission.WALLET_MINT), C.topUp);
billingRouter.post('/adjustments', requirePermission(Permission.WALLET_ADJUST), C.adjust);

// Managed accounts
billingRouter.get('/users/:id/summary', C.userSummary);
billingRouter.get('/users/:id/ledger', C.userLedger);
billingRouter.get('/users/:id/usage', C.userUsage);
billingRouter.patch('/users/:id/config', requirePermission(Permission.BILLING_CUSTOMERS), C.configureUserBilling);
billingRouter.post('/users/:id/freeze', requirePermission(Permission.USERS_SUSPEND), C.freezeUser);
billingRouter.post('/users/:id/close-cycle', C.closeUserCycle);

// Pricing
billingRouter.get('/pricing/rules', C.listPriceRules);
billingRouter.put('/pricing/resellers/:id', requirePermission(Permission.PRICING_RESELLER_MARKUP), C.setResellerMarkup);
billingRouter.put('/pricing/customers', requirePermission(Permission.PRICING_SET_CUSTOMER_MARKUP), C.setCustomerMarkup);
billingRouter.delete('/pricing/rules/:id', C.deletePriceRule);

// Reports
billingRouter.get('/reports/platform', requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), C.platformOverview);
billingRouter.get('/reports/reseller', requireRole(UserRole.RESELLER, UserRole.SUPER_ADMIN), C.resellerOverview);
