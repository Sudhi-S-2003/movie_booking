import type { Request, Response, NextFunction } from 'express';
import type { Socket } from 'socket.io';
import { getClientIp } from '../utils/ip.util.js';
import { RateLimit } from '../models/rateLimit.model.js';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number;      // Maximum requests allowed per window
  message: string;  // Response message when limit is exceeded
}

/**
 * Generic Mongoose-backed rate limiting middleware factory.
 * Employs atomic operations to avoid concurrency race conditions and utilizes
 * MongoDB's native TTL indexes for background record expiration.
 */
export const rateLimiter = (config: RateLimitConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIp(req);
      const key = `ratelimit:${req.originalUrl || req.path}:${ip}`;
      const now = Date.now();

      // Step 1: Try to atomically increment if the existing window is still active
      let record = await RateLimit.findOneAndUpdate(
        { key, expiresAt: { $gt: new Date(now) } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      );

      // Step 2: If no active window exists (expired or first-time), insert or reset the key
      if (!record) {
        const expiresAt = new Date(now + config.windowMs);
        record = await RateLimit.findOneAndUpdate(
          { key },
          { $set: { count: 1, expiresAt } },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
      }

      // Step 3: Validate request count limit
      if (record && record.count > config.max) {
        res.status(429).json({
          success: false,
          message: config.message,
        });
        return;
      }

      next();
    } catch (error) {
      // Fail-open: log error but do not disrupt client access if DB is offline
      console.error('[RateLimiter] Error:', error);
      next();
    }
  };
};

/**
 * Strict individual rate limiter for authentication routes (login, registration, passkeys).
 * Protects against password-spraying and brute-force cracking.
 * Max: 15 requests per 5 minutes per IP address.
 */
export const authRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15,
  message: 'Too many authentication attempts from this IP. Please try again after 5 minutes.',
});

/**
 * Global rate limiter for API endpoints.
 * Protects against denial-of-service, automated scraping, or general service abuse.
 * Max: 200 requests per 1 minute per IP address.
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  message: 'Too many requests. Please slow down and try again after a minute.',
});

/**
 * Mongoose-backed rate limiter for Socket.io connection handshakes.
 * Scopes key to the namespace + client IP to prevent connection exhaustion attacks.
 */
export const socketRateLimiter = (config: { windowMs: number; max: number }) => {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const headers = socket.handshake.headers || {};
      const mockReq = {
        headers,
        ip: socket.handshake.address,
        socket: {
          remoteAddress: socket.handshake.address,
        },
      } as any;

      const ip = getClientIp(mockReq);
      const key = `ratelimit:socket:${socket.nsp.name}:${ip}`;
      const now = Date.now();

      // Step 1: Try to atomically increment if window is still active
      let record = await RateLimit.findOneAndUpdate(
        { key, expiresAt: { $gt: new Date(now) } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      );

      // Step 2: Reset window if first connection or expired
      if (!record) {
        const expiresAt = new Date(now + config.windowMs);
        record = await RateLimit.findOneAndUpdate(
          { key },
          { $set: { count: 1, expiresAt } },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
      }

      // Step 3: Validate socket connection count
      if (record && record.count > config.max) {
        console.warn(`[Socket Rate Limit] Blocked IP ${ip} on namespace ${socket.nsp.name}`);
        next(new Error('Too many connection attempts. Please try again later.'));
        return;
      }

      next();
    } catch (error) {
      // Fail-open: log connection error but keep socket functional
      console.error('[Socket RateLimiter] Error:', error);
      next();
    }
  };
};

/**
 * Global rate limiter for Socket.io connection handshakes.
 * Limits connection attempts to a maximum of 30 connections per 1 minute per IP.
 */
export const globalSocketRateLimiter = socketRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
});
