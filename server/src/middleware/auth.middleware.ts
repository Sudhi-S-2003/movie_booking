import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import { Session } from '../models/session.model.js';
import { UserRole, UserStatus } from '../constants/enums.js';
import type { JwtPayload } from '../interfaces/auth.interface.js';
import { requirePermission, requireRole } from '../modules/access/access.middleware.js';
import { Permission } from '../modules/access/access.constants.js';

// Single source of truth for "who is the caller?". Handlers trust req.user.

const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload & { is2FAPending?: boolean };
  // A 2FA-pending temp token must never act as an access token.
  if (decoded.is2FAPending || !decoded.sessionId) throw new Error('Not an access token');
  return decoded;
};

/** Resolve the session + active user for a token, or null. */
const resolveCaller = async (token: string) => {
  const decoded = verifyToken(token);
  const session = await Session.findOne({ _id: decoded.sessionId, userId: decoded.id, isValid: true });
  if (!session) return { error: 'Session expired or revoked' as const };
  const user = await User.findById(decoded.id);
  if (!user) return { error: 'User not found' as const };
  if (user.status !== UserStatus.ACTIVE) return { error: 'Account is not active' as const };
  Session.updateOne({ _id: session._id }, { lastActive: new Date() }).catch(console.error);
  return { user, session };
};

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required' });
  try {
    const result = await resolveCaller(token);
    if ('error' in result) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: result.error });
    req.user = result.user;
    req.userId = result.user._id.toString();
    req.sessionId = result.session._id.toString();
    next();
  } catch {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
};

/** Attach req.user when a valid token is present; continue anonymously otherwise. */
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req);
  if (!token) return next();
  try {
    const result = await resolveCaller(token);
    if (!('error' in result)) {
      req.user = result.user;
      req.userId = result.user._id.toString();
      req.sessionId = result.session._id.toString();
    }
  } catch {
    // invalid token — continue anonymously
  }
  next();
};

/** Platform staff (super admin / admin). */
export const isAdmin = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
/** Movie service operators (theatre owners) — a permission, not a role. */
export const isTheatreOwner = requirePermission(Permission.MOVIES_OPERATE);
