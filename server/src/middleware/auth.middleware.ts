import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import { UserRole } from '../constants/enums.js';
import type { JwtPayload } from '../interfaces/auth.interface.js';

// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware
//
// One source of truth for "who is the caller?". Controllers downstream should
// never touch req.headers.authorization or verify JWTs themselves — they just
// type their handler as (req: AuthRequest, res: Response) and trust req.user.
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = env.JWT_SECRET;

/** Pull a bearer token out of the Authorization header, or null. */
const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
};

/** Verify + decode a JWT. Throws on invalid/expired tokens. */
const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload;

/**
 * Require auth. On success, attaches the hydrated User doc to req.user and
 * calls next(). On failure, responds 401 — the handler never runs.
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Optional auth. Attaches req.user if a valid token is present, otherwise
 * leaves it undefined. Used by endpoints that behave differently for
 * logged-in vs anonymous callers but don't require auth.
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch {
    // invalid token — leave req.user undefined and continue anonymously
  }
  next();
};

/** Role gate — must run after isAuthenticated. */
const requireRole = (...allowed: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (user && allowed.includes(user.role as UserRole)) return next();
    return res
      .status(403)
      .json({ success: false, message: 'Access denied. Insufficient role.' });
  };

export const isTheatreOwner = requireRole(UserRole.THEATRE_OWNER, UserRole.ADMIN);
export const isAdmin = requireRole(UserRole.ADMIN);
