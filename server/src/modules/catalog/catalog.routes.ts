import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../access/access.middleware.js';
import { Permission } from '../access/access.constants.js';
import * as C from './catalog.controller.js';

/** /api/services */
export const catalogRouter = Router();
// Public price list must be registered before the auth middleware.
catalogRouter.get('/public', C.publicCatalog);
catalogRouter.use(isAuthenticated);
catalogRouter.get('/', C.listMyServices);
catalogRouter.get('/catalog', requirePermission(Permission.SERVICES_MANAGE), C.listCatalog);
catalogRouter.patch('/catalog/:key', requirePermission(Permission.SERVICES_MANAGE), C.patchService);
catalogRouter.get('/users/:id', requirePermission(Permission.USERS_READ), C.listUserServices);
catalogRouter.put('/users/:id/:key', requirePermission(Permission.SERVICES_ASSIGN), C.assignUserService);
catalogRouter.put('/:key/enabled', C.toggleMyService);
catalogRouter.put('/:key/config', C.configureMyService);
