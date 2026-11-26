import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../access/access.middleware.js';
import { Permission } from '../access/access.constants.js';
import * as C from './accounts.controller.js';

/** /api/account — the caller's own account. */
export const accountRouter = Router();
accountRouter.use(isAuthenticated);
accountRouter.get('/me', C.getMe);
accountRouter.patch('/me', C.updateMe);
accountRouter.get('/reseller-application', C.getMyApplication);
accountRouter.post('/reseller-application', C.applyReseller);

/**
 * /api/manage — managing other accounts. Every handler re-checks scope
 * (subtree for resellers, non-staff for admins, never protected accounts).
 */
export const manageRouter = Router();
manageRouter.use(isAuthenticated);
manageRouter.get('/users', requirePermission(Permission.USERS_READ), C.listUsers);
manageRouter.post('/users', requirePermission(Permission.USERS_CREATE), C.createUser);
manageRouter.get('/users/:id', requirePermission(Permission.USERS_READ), C.getUser);
manageRouter.patch('/users/:id', requirePermission(Permission.USERS_UPDATE), C.updateUser);
manageRouter.post('/users/:id/suspend', requirePermission(Permission.USERS_SUSPEND), C.suspendUser);
manageRouter.post('/users/:id/reactivate', requirePermission(Permission.USERS_SUSPEND), C.reactivateUser);
manageRouter.post('/users/:id/close', requirePermission(Permission.USERS_CLOSE), C.closeUser);
manageRouter.post('/users/:id/role', C.changeRole);
manageRouter.get('/reseller-applications', requirePermission(Permission.RESELLERS_PROMOTE), C.listApplications);
manageRouter.post('/reseller-applications/:id/decision', requirePermission(Permission.RESELLERS_PROMOTE), C.decideApplication);
manageRouter.get('/audit', C.listAudit);
