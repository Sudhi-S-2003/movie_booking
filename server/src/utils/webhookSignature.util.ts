// ─────────────────────────────────────────────────────────────────────────────
// webhookSignature.util
//
// Shared signature-verification helpers for inbound webhooks. The "telinfy"
// webhook (see `controllers/webhooks/telinfy.controller.ts`) is the first
// consumer; the primitives are kept generic so other providers can reuse them.
//
// ────────────────────────────────────────────────────────────────────────────
// Critical rule — DO NOT canonicalize the body before HMAC
// ────────────────────────────────────────────────────────────────────────────
// The HMAC is computed over the EXACT BYTES the sender transmitted. Attempting
// to re-serialize the parsed JSON (prettifying, sorting keys, collapsing
// whitespace, etc.) on either the sender or the receiver side produces a
// different byte stream and breaks the signature — even when the semantic
// content is identical. Senders must sign their outgoing body, then send the
// same bytes on the wire. Receivers must HMAC the raw bytes they received,
// before any parser touches them.
//
// Why we use `express.raw({ type: 'application/json' })` on the signature
// route: `express.json()` would parse, then our `JSON.stringify` of
// `req.body` would almost certainly produce different bytes than the sender
// intended (key order in JS is insertion order, but key order after JSON.parse
// → JSON.stringify doesn't always match, especially with special chars,
// unicode, or numeric keys). Working on raw bytes sidesteps all of it.
//
// This matches the pattern used by Stripe, GitHub, Slack, etc.
//
// Design:
//   • The caller supplies a timestamp + HMAC-SHA256 signature computed over
//     `<timestamp>.<raw-body-bytes>` using a pre-shared secret.
//   • The server derives its HMAC key from `env.TELINFY_WEBHOOK_SECRET` via
//     `sha256('telinfy:' + secret)` — a leak of the derived key doesn't
//     reveal the original secret.
//   • The signature comparison uses `timingSafeEqual` so an attacker can't
//     learn prefix information by timing the responses.
//   • A 5-minute tolerance window rejects stale signatures (replay protection)
//     and a 1-minute forward slack absorbs clock drift between peers.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

/**
 * Accept multiple header-name variants for the signature + timestamp so we
 * don't have to rebuild the verifier every time a provider picks a slightly
 * different convention. Order in each list is priority (first match wins).
 * Names are compared case-insensitively — Node normalizes request headers
 * to lowercase, but senders may not.
 */
const TIMESTAMP_HEADER_CANDIDATES = [
  'x-telinfy-timestamp',
  'x-telinfy-signature-timestamp',
  'x-signature-timestamp',
  'x-timestamp',
  'x-webhook-timestamp',
] as const;

const SIGNATURE_HEADER_CANDIDATES = [
  'x-telinfy-signature',
  'x-signature',
  'x-webhook-signature',
  'x-hub-signature-256',
] as const;

/** Primary names for documentation / header advertising. */
const TIMESTAMP_HEADER = TIMESTAMP_HEADER_CANDIDATES[0];
const SIGNATURE_HEADER = SIGNATURE_HEADER_CANDIDATES[0];

/** Look up the first header name (case-insensitive) that was actually sent. */
const pickHeader = (
  headers: Record<string, string | string[] | undefined>,
  candidates: readonly string[],
): string | undefined => {
  for (const name of candidates) {
    const raw = headers[name] ?? headers[name.toLowerCase()];
    if (raw === undefined) continue;
    return Array.isArray(raw) ? raw[0] : raw;
  }
  return undefined;
};

/** How old a signature may be before we reject it (replay protection). */
const MAX_AGE_MS     = 5 * 60 * 1000;
/** How far into the future a signature may be (clock-drift tolerance). */
const MAX_SKEW_MS    = 60 * 1000;

export type VerifyReason =
  | 'missing_headers'
  | 'bad_timestamp'
  | 'stale'
  | 'future'
  | 'bad_signature'
  | 'secret_unset';

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: VerifyReason };

/**
 * Derive the HMAC key. `createHash` over a namespaced seed keeps the on-disk
 * secret and the wire-facing HMAC key distinct — a leak of one doesn't
 * trivially reveal the other.
 */
const deriveKey = (): Buffer | null => {
  const secret = env.TELINFY_WEBHOOK_SECRET;
  if (!secret) return null;
  return createHash('sha256').update(`telinfy:${secret}`).digest();
};

/**
 * Compute the signature the caller should have sent for a given (ts, body).
 * HMACs over the raw bytes of the body — never re-stringified or canonicalised
 * — so Unicode, emoji, and whitespace-sensitive payloads all sign identically
 * on sender and receiver (see the "Critical rule" block at the top).
 */
export const computeSignature = (timestamp: number | string, rawBody: Buffer | string): string | null => {
  const key = deriveKey();
  if (!key) return null;
  const bodyBuf = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  return createHmac('sha256', key)
    .update(`${timestamp}.`)
    .update(bodyBuf)        // raw bytes, no re-encoding
    .digest('hex');
};

const safeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
};

/**
 * Verify a webhook request. Pass the raw body the HMAC was computed over —
 * NOT the parsed JSON object (serialization can reorder keys and break the
 * signature). Handlers should configure Express with `express.raw({ type:
 * 'application/json' })` on these routes so `req.body` is a Buffer.
 */
export const verifyTelinfySignature = (
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer | string,
): VerifyResult => {
  const key = deriveKey();
  if (!key) return { ok: false, reason: 'secret_unset' };

  const ts  = pickHeader(headers, TIMESTAMP_HEADER_CANDIDATES);
  let   sig = pickHeader(headers, SIGNATURE_HEADER_CANDIDATES);
  if (typeof ts !== 'string' || typeof sig !== 'string' || !ts || !sig) {
    return { ok: false, reason: 'missing_headers' };
  }

  // Some providers prefix the hex with `sha256=` (GitHub-style) — strip it.
  if (sig.startsWith('sha256=')) sig = sig.slice('sha256='.length);

  let tsMs = Number(ts);
  if (!Number.isFinite(tsMs) || tsMs <= 0) {
    return { ok: false, reason: 'bad_timestamp' };
  }
  // Heuristic: if the timestamp looks like seconds since epoch (10 digits or
  // fewer → up to year 2286), promote it to milliseconds. Senders differ on
  // this — Stripe uses seconds, others use ms.
  if (tsMs < 1e12) tsMs = tsMs * 1000;

  const now = Date.now();
  if (now - tsMs > MAX_AGE_MS)  return { ok: false, reason: 'stale' };
  if (tsMs - now > MAX_SKEW_MS) return { ok: false, reason: 'future' };

  const expected = computeSignature(ts, rawBody);
  if (!expected)                      return { ok: false, reason: 'secret_unset' };
  if (!safeEqualHex(expected, sig))   return { ok: false, reason: 'bad_signature' };

  return { ok: true };
};

/** Exposed for tests / CLI clients building requests toward this server. */
export const TELINFY_HEADERS = {
  TIMESTAMP_HEADER,
  SIGNATURE_HEADER,
} as const;
