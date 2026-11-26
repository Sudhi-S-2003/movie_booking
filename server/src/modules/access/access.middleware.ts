import type { RequestHandler } from 'express';
import type { UserRole } from '../../constants/enums.js';
import { hasPermission } from './access.service.js';
import type { Permission } from './access.constants.js';

const deny = (res: Parameters<RequestHandler>[1], message: string) =>
  res.status(403).json({ success: false, code: 'FORBIDDEN', message });

/** Require every listed permission. Must run after `isAuthenticated`. */
export const requirePermission = (...permissions: (Permission | string)[]): RequestHandler =>
  (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' });
    if (permissions.every((p) => hasPermission(user, p))) return next();
    return deny(res, 'You do not have permission to perform this action');
  };

/** Require one of the listed roles. Prefer `requirePermission` for new code. */
export const requireRole = (...roles: UserRole[]): RequestHandler =>
  (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' });
    if (roles.includes(user.role)) return next();
    return deny(res, 'Access denied. Insufficient role.');
  };
