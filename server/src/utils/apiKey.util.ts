// ─────────────────────────────────────────────────────────────────────────────
// apiKey.util
//
// Pure helpers for the API-key lifecycle:
//   • `generateKeyId`       — public identifier ("ak_<base36>")
//   • `generateSecret`      — the secret string returned ONCE to the caller
//   • `hashSecret` / `verifySecret` — bcrypt wrappers
//   • `maskKeyId`           — for display ("ak_xxxxxxxx" → "ak_xxxx…abcd")
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

// bcrypt cost factor:
//   • Production → 10 rounds (~100 ms on a real server; brute-force resistant)
//   • Development → 4 rounds (~1 ms; secrets are ephemeral, speed matters)
// If you see 15–30 s POST /api/keys times, this is the culprit — bcrypt blocks
// the Node.js event loop proportionally to 2^rounds on the hashing CPU.
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'production' ? 10 : 4;

/** Public, non-sensitive identifier for an API key. Prefixed for grep-ability. */
export const generateKeyId = (): string =>
  `ak_${randomBytes(12).toString('base64url')}`;

/** The raw secret — shown exactly once, then discarded. 32 bytes of entropy. */
export const generateSecret = (): string =>
  `as_${randomBytes(32).toString('base64url')}`;

export const hashSecret  = (secret: string): Promise<string> =>
  bcrypt.hash(secret, BCRYPT_ROUNDS);

export const verifySecret = (secret: string, hash: string): Promise<boolean> =>
  bcrypt.compare(secret, hash);

/** "ak_AbCdEfGh…xyz0" — safe to log / display. */
export const maskKeyId = (keyId: string): string => {
  if (keyId.length <= 12) return keyId;
  return `${keyId.slice(0, 7)}…${keyId.slice(-4)}`;
};
