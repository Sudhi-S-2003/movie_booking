import type { Request } from 'express';

/**
 * Server-wide pagination defaults. A single source of truth so every
 * endpoint uses the same page size and — more importantly — the same
 * maximum limit to prevent `?limit=1000000` abuse on list endpoints.
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT:     50,
  MAX_PAGE:      10_000, // protects skip-based queries from ~quadratic MongoDB scans
} as const;

export interface PageParams {
  page:  number;
  limit: number;
  skip:  number;
}

export interface PageEnvelope {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/**
 * Parse `page` + `limit` from the query string, clamped to safe bounds.
 * Pass a `defaultLimit` per endpoint if you want a different default
 * (e.g. 20 for comments) — but the cap is always PAGINATION.MAX_LIMIT.
 */
export const parsePage = (
  req: Request,
  defaultLimit: number = PAGINATION.DEFAULT_LIMIT,
): PageParams => {
  const rawPage  = parseInt((req.query.page  as string) || '1', 10);
  const rawLimit = parseInt((req.query.limit as string) || String(defaultLimit), 10);

  const page  = clamp(Number.isFinite(rawPage)  ? rawPage  : 1,            1, PAGINATION.MAX_PAGE);
  const limit = clamp(Number.isFinite(rawLimit) ? rawLimit : defaultLimit, 1, PAGINATION.MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
};

/** Build the standard pagination envelope returned alongside list results. */
export const buildPageEnvelope = (
  total: number,
  { page, limit }: PageParams,
): PageEnvelope => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
