import type { Request } from 'express';

/**
 * Client IP as resolved by Express. Proxy headers are honoured only for the
 * number of hops configured via `TRUST_PROXY_HOPS` (see app.ts
 * `trust proxy`), so a client cannot spoof its IP with X-Forwarded-For.
 */
export const getClientIp = (req: Pick<Request, 'ip' | 'socket'>): string =>
  req.ip || req.socket?.remoteAddress || 'unknown';
