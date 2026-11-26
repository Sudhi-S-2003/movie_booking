import { signApiService, clampTtlMinutes, type SignedScope } from './signature.util.js';
import { env } from '../env.js';
import { ApiServiceCategory } from '../constants/enums.js';

const PATHS: Record<string, string> = {
  [ApiServiceCategory.CODE_SHARE]: '/code-share',
  [ApiServiceCategory.CODE_SHARE_V2]: '/code-share-v2',
};

/** Actions that mutate a resource; they require a `write`-scoped link and POST. */
export const WRITE_ACTIONS = new Set(['update', 'delete', 'v2-commit']);

/**
 * Build a signed guest link for a resource. The scope is part of the HMAC
 * payload, so a `read` link cannot be turned into a `write` link.
 */
export const generateSignedUrlData = (
  resourceId: string,
  category: string,
  expiryMinutes?: unknown,
  scope: SignedScope = 'write',
) => {
  const base = PATHS[category];
  if (!base) throw new Error(`Category '${category}' is not supported for signed links`);
  const ttlMinutes = clampTtlMinutes(expiryMinutes, 15);
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const signature = signApiService(resourceId, category, expiresAt, scope);
  const qs = new URLSearchParams({ signature, expiresAt: String(expiresAt), category, scope });
  const signedUrl = `${env.FRONTEND_URL}${base}/${resourceId}?${qs.toString()}`;
  return { signedUrl, expiresAt, signature, scope };
};
