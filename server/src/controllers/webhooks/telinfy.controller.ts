// ─────────────────────────────────────────────────────────────────────────────
// webhooks/telinfy.controller
//
// Two inbound webhook endpoints:
//
//   POST /api/webhooks/telinfy              → always ACK (smoke-test / probe)
//   POST /api/webhooks/telinfy/signature    → ACK only if HMAC signature
//                                             verifies; otherwise NACK
//
// Both endpoints log a one-line summary of request + response for ops. The
// signature endpoint also echoes the specific `reason` on NACK so the caller
// can correct their integration without the server leaking timing info
// (signature comparison itself is timing-safe; the reason codes cover
// header / timestamp failures that happen before the HMAC check).
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import {
  verifyTelinfySignature,
  TELINFY_HEADERS,
} from '../../utils/webhookSignature.util.js';

/** Shape of the payload body, kept deliberately loose — providers evolve. */
type WebhookBody = unknown;

interface AckResponse {
  status:     'ack';
  receivedAt: string;
  /** Short echo so the provider can correlate. `null` when body is unparseable. */
  eventId:   string | null;
}

interface NackResponse {
  status:     'nack';
  reason:     string;
  receivedAt: string;
}

/** Extract a best-effort event id from the payload for logging + echoing. */
const extractEventId = (body: WebhookBody): string | null => {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    for (const key of ['eventId', 'event_id', 'id', 'messageId']) {
      const v = b[key];
      if (typeof v === 'string' && v.length > 0 && v.length < 200) return v;
    }
  }
  return null;
};

/** Compact log line; swap for structured logging once the rest of the app adopts one. */
const log = (route: string, status: 'ack' | 'nack', extra: Record<string, unknown> = {}) => {
  const parts = [`[webhook:${route}]`, status.toUpperCase()];
  for (const [k, v] of Object.entries(extra)) parts.push(`${k}=${v}`);
  console.log(parts.join(' '));
};

/**
 * Redact common credential-bearing header names before dumping to the log so
 * an attacker reading server logs can't trivially lift the webhook's own
 * auth material. The X-Signature itself is fine to print — it's a hex hash,
 * not the secret.
 */
const REDACTED_HEADER_PREFIXES = ['authorization', 'cookie', 'proxy-authorization'];
const redactHeaders = (headers: Record<string, string | string[] | undefined>): Record<string, string | string[]> => {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    const lower = k.toLowerCase();
    if (REDACTED_HEADER_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
      out[k] = '[redacted]';
    } else {
      out[k] = v;
    }
  }
  return out;
};

/**
 * Dump the full request (method, URL, headers, body) + the outgoing response
 * to stdout. Used by both routes so ops can grep for `[webhook:telinfy]`
 * and see both sides of every interaction. Body is printed as-is — for the
 * signature route that's the raw bytes (decoded as UTF-8), for the plain
 * route it's the parsed JSON object.
 */
const dump = (
  route: string,
  req: Request,
  body: unknown,
  response: AckResponse | NackResponse,
): void => {
  console.log(`─── [webhook:${route}] ${req.method} ${req.originalUrl} ─────────────`);
  console.log('headers:', redactHeaders(req.headers as Record<string, string | string[] | undefined>));
  console.log('body:',    body);
  console.log('response:', response);
  console.log(`─── end [webhook:${route}] ─────────────────────────────────────`);
};

// ── POST /api/webhooks/telinfy ──────────────────────────────────────────────
/**
 * The unauthenticated probe endpoint. Accepts any JSON body, always returns
 * ACK. Useful for `health`-style liveness checks where the provider just wants
 * to confirm the path is reachable.
 */
export const telinfy = (req: Request, res: Response): void => {
  const body: WebhookBody = req.body;
  const eventId = extractEventId(body);
  const payload: AckResponse = {
    status:     'ack',
    receivedAt: new Date().toISOString(),
    eventId,
  };
  log('telinfy', 'ack', { eventId: eventId ?? '-' });
  dump('telinfy', req, body, payload);
  res.status(200).json(payload);
};

// ── POST /api/webhooks/telinfy/signature ────────────────────────────────────
/**
 * The signed endpoint. Mounted with `express.raw({ type: 'application/json' })`
 * so `req.body` is a Buffer — HMAC must be computed over the bytes the client
 * sent, not over our JSON.stringify of the parsed object (key reordering would
 * break the signature).
 *
 * The router parses the Buffer to JSON AFTER verification succeeds, so the
 * handler logic below works with the parsed payload.
 */
export const telinfySignature = (req: Request, res: Response): void => {
  const raw = (req.body as Buffer | undefined) ?? Buffer.alloc(0);

  // Try to parse EARLY so the log output is a friendly object, not the raw
  // byte blob. This is purely for observability — verification itself still
  // runs against the raw bytes (see `verifyTelinfySignature`). If parsing
  // fails we log the raw UTF-8 string instead.
  let parsedForLog: WebhookBody = null;
  try {
    parsedForLog = raw.length > 0 ? JSON.parse(raw.toString('utf8')) as WebhookBody : null;
  } catch {
    parsedForLog = raw.toString('utf8');
  }

  const verdict = verifyTelinfySignature(req.headers as Record<string, string | string[] | undefined>, raw);
  if (!verdict.ok) {
    const payload: NackResponse = {
      status:     'nack',
      reason:     verdict.reason,
      receivedAt: new Date().toISOString(),
    };
    log('telinfy/signature', 'nack', { reason: verdict.reason });
    dump('telinfy/signature', req, parsedForLog, payload);
    res.status(401).json(payload);
    return;
  }

  // Reuse the early-parse result if it was valid JSON; else treat as NACK
  // since a valid HMAC can't be over a non-JSON body for this endpoint.
  if (typeof parsedForLog === 'string') {
    const payload: NackResponse = {
      status:     'nack',
      reason:     'bad_json',
      receivedAt: new Date().toISOString(),
    };
    log('telinfy/signature', 'nack', { reason: 'bad_json' });
    dump('telinfy/signature', req, parsedForLog, payload);
    res.status(400).json(payload);
    return;
  }

  const eventId = extractEventId(parsedForLog);
  const payload: AckResponse = {
    status:     'ack',
    receivedAt: new Date().toISOString(),
    eventId,
  };
  log('telinfy/signature', 'ack', { eventId: eventId ?? '-' });
  dump('telinfy/signature', req, parsedForLog, payload);
  res.status(200).json(payload);
};

/** Re-export the header constants so the route file can advertise them. */
export { TELINFY_HEADERS };
