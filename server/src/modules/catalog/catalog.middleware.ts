import type { RequestHandler } from 'express';
import { resolveAccess } from './entitlement.service.js';

export interface ServiceGateOptions {
  /** Let unauthenticated requests through (routes with their own guest auth). */
  allowAnonymous?: boolean;
  /** Only gate state-changing methods; reads stay public (catalog browsing). */
  writesOnly?: boolean;
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Gate a route on service access. Runs after `isAuthenticated`,
 * `optionalAuthenticate` or `isAuthenticatedApiKey` (all set req.user).
 */
export const requireService = (serviceKey: string, opts: ServiceGateOptions = {}): RequestHandler =>
  async (req, res, next) => {
    try {
      if (opts.writesOnly && READ_METHODS.has(req.method)) return next();
      if (!req.user) {
        if (opts.allowAnonymous) return next();
        return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' });
      }
      const decision = await resolveAccess(req.user, serviceKey);
      if (decision.usable) return next();
      return res.status(403).json({
        success: false,
        code: 'SERVICE_NOT_ENABLED',
        message: decision.reason === 'not_enabled'
          ? 'Enable this service on your Services page to use it'
          : 'This service is not available to your account',
        details: { service: serviceKey, reason: decision.reason },
      });
    } catch (err) {
      next(err);
    }
  };
