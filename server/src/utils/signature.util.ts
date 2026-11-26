import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

/**
 * HMAC key for signed URLs / captcha / webhook URLs. Kept separate from the
 * JWT key; when SIGNING_SECRET is unset we derive a distinct key from
 * JWT_SECRET so the two are never byte-identical.
 */
const signingKey: Buffer = env.SIGNING_SECRET
  ? Buffer.from(env.SIGNING_SECRET)
  : createHash('sha256').update(`signing:${env.JWT_SECRET}`).digest();

export const hmacHex = (payload: string): string =>
  createHmac('sha256', signingKey).update(payload).digest('hex');

/** Constant-time string comparison (false on length mismatch). */
export const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
};

/** Max lifetime for any signed guest link. */
export const MAX_SIGNED_TTL_MINUTES = 7 * 24 * 60;
export const clampTtlMinutes = (raw: unknown, fallback: number): number => {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
  return Math.min(Math.max(1, Math.floor(n)), MAX_SIGNED_TTL_MINUTES);
};

/**
 * Access scope carried by a signed link. `read` links can only view;
 * `write` links can also mutate. Encoded into the signed payload so a read
 * link cannot be upgraded by editing the URL.
 */
export type SignedScope = 'read' | 'write';

export const signConversation = (conversationId: string, expiresAt: number): string =>
  hmacHex(`conv:${conversationId}:${expiresAt}`);

export const verifyConversationSignature = (
  conversationId: string,
  signature: string,
  expiresAt: number,
): boolean => {
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return safeEqual(signConversation(conversationId, expiresAt), signature);
};

export const signId = (id: string, timestamp: string | number): string =>
  hmacHex(`id:${id}:${timestamp}`);

export const verifyIdSignature = (id: string, signature: string, timestamp: string | number): boolean =>
  safeEqual(signId(id, timestamp), signature);

export const signApiService = (
  serviceId: string,
  category: string,
  expiresAt: number,
  scope: SignedScope = 'write',
): string => hmacHex(`service:${category}:${serviceId}:${expiresAt}:${scope}`);

export const verifyApiServiceSignature = (
  serviceId: string,
  category: string,
  signature: string,
  expiresAt: number,
  scope: SignedScope = 'write',
): boolean => {
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return safeEqual(signApiService(serviceId, category, expiresAt, scope), signature);
};
