import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';
import { getClientIp } from '../utils/ip.util.js';
import { RateLimit } from '../models/rateLimit.model.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  /**
   * Bucket name. The key is `scope + identity` only — never the URL — so a
   * client cannot mint fresh buckets by varying paths or query strings.
   */
  scope: string;
  /** Override the identity (default: client IP). */
  keyFn?: (req: Request) => string;
}

/** Atomic fixed-window counter in Mongo (TTL index expires old windows). */
const hit = async (key: string, windowMs: number): Promise<number> => {
  const now = Date.now();
  let record = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: new Date(now) } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' },
  );
  if (!record) {
    record = await RateLimit.findOneAndUpdate(
      { key },
      { $set: { count: 1, expiresAt: new Date(now + windowMs) } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }
  return record?.count ?? 0;
};

/** Test runs exercise auth many times from one IP; limits are only skippable in NODE_ENV=test. */
const limitsDisabled = () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === '1';

export const rateLimiter = (config: RateLimitConfig) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (limitsDisabled()) return next();
    try {
      const identity = config.keyFn ? config.keyFn(req) : getClientIp(req);
      const count = await hit(`ratelimit:${config.scope}:${identity}`, config.windowMs);
      if (count > config.max) {
        res.setHeader('Retry-After', Math.ceil(config.windowMs / 1000));
        return res.status(429).json({ success: false, code: 'RATE_LIMITED', message: config.message });
      }
      next();
    } catch (error) {
      // Fail-open so a DB blip doesn't take the API down; it is logged.
      console.error('[RateLimiter] Error:', error);
      next();
    }
  };

/** Login / register / passkey: 15 per 5 minutes per IP. */
export const authRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  scope: 'auth',
  message: 'Too many authentication attempts. Please try again in 5 minutes.',
});

/** Global API limit: 300 per minute per IP. */
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  scope: 'api',
  message: 'Too many requests. Please slow down.',
});

/** Unauthenticated write endpoints (guest tickets, public shares): 20 per 10 min. */
export const publicWriteRateLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  scope: 'public-write',
  message: 'Too many submissions. Please try again later.',
});

export const socketRateLimiter = (config: { windowMs: number; max: number }) =>
  async (socket: Socket, next: (err?: Error) => void) => {
    if (limitsDisabled()) return next();
    try {
      const ip = socket.handshake.address || 'unknown';
      const count = await hit(`ratelimit:socket:${socket.nsp.name}:${ip}`, config.windowMs);
      if (count > config.max) return next(new Error('Too many connection attempts. Please try again later.'));
      next();
    } catch (error) {
      console.error('[Socket RateLimiter] Error:', error);
      next();
    }
  };

export const globalSocketRateLimiter = socketRateLimiter({ windowMs: 60 * 1000, max: 30 });
