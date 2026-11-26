import type { Request } from 'express';
import { hmacHex, safeEqual } from '../../utils/signature.util.js';
import { hasPermission } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';

/**
 * Guest tickets have no account, so the guest proves ownership with a
 * per-ticket token returned once at creation (HMAC of the ticket id under
 * the server signing key). Sent back as the `x-guest-token` header.
 */
export const issueGuestToken = (issueId: string): string => hmacHex(`issue-guest:${issueId}`).slice(0, 40);

export const isValidGuestToken = (issueId: string, token: unknown): boolean =>
  typeof token === 'string' && token.length > 0 && safeEqual(issueGuestToken(issueId), token);

export const isSupportStaff = (req: Pick<Request, 'user'>): boolean =>
  !!req.user && hasPermission(req.user, Permission.SUPPORT_MANAGE);

/** Owner, support staff, or the guest holding this ticket's token. */
export const canAccessIssue = (
  req: Pick<Request, 'user' | 'headers'>,
  issue: { _id: unknown; userId?: unknown; isGuest?: boolean },
): boolean => {
  if (isSupportStaff(req)) return true;
  if (req.user && issue.userId && String(issue.userId) === String(req.user._id)) return true;
  return !!issue.isGuest && isValidGuestToken(String(issue._id), req.headers['x-guest-token']);
};

/** Parse "id:token,id:token" into the ids whose tokens are valid. */
export const verifiedGuestIssueIds = (raw: unknown): string[] =>
  typeof raw !== 'string'
    ? []
    : raw.split(',').slice(0, 50).map((pair) => pair.split(':'))
        .filter(([id, token]) => id && /^[a-f0-9]{24}$/i.test(id) && isValidGuestToken(id, token))
        .map(([id]) => id!);
