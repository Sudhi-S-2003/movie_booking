// ─────────────────────────────────────────────────────────────────────────────
// publicName.util
//
// Validation + normalization of a conversation's `publicName` (slug).
//
// Rules (kept deliberately conservative — the slug lives in URLs):
//   • 3-32 characters
//   • lowercase alphanumeric + hyphen
//   • cannot start or end with a hyphen
//   • cannot contain consecutive hyphens
//
// `normalizePublicName` canonicalizes input (trim + lowercase) before
// validation. Keep it side-effect free so controllers can compose it.
// ─────────────────────────────────────────────────────────────────────────────

const MIN_LEN = 3;
const MAX_LEN = 32;
const FORMAT  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED = new Set([
  'admin', 'api', 'app', 'auth', 'chat', 'dashboard', 'help', 'invite',
  'join', 'login', 'logout', 'me', 'new', 'owner', 'settings', 'signup',
  'support', 'system', 'user', 'users',
]);

/**
 * Slugify arbitrary text for use as a URL-safe segment.
 * Collapses any non-alphanumeric run into a single hyphen and trims the
 * edges. Empty-string output is the caller's cue to pick a default.
 */
const slugify = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Random URL-safe suffix — 8 chars of base36 entropy. Used by auto-generated
 * slugs to keep them unique in the partial index.
 */
const randomSuffix = (len = 8): string => {
  let out = '';
  while (out.length < len) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, len);
};

/**
 * Build an auto-slug for conversation types whose slug isn't user-chosen
 * (direct and system chats). Always returns a value that passes
 * `validatePublicName`.
 *
 *   direct  → "d-<random>"                  e.g. "d-xk2a8hpr"
 *   system  → "s-<title-slug>-<random>"     e.g. "s-followers-xk2a8hpr"
 */
export const generateAutoPublicName = (
  type: 'direct' | 'system' | 'api',
  opts: { title?: string } = {},
): string => {
  const suffix = randomSuffix(8);
  if (type === 'direct') return `d-${suffix}`;
  if (type === 'api')    return `a-${suffix}`;

  const titleSlug = slugify(opts.title ?? '').slice(0, 16);
  return titleSlug ? `s-${titleSlug}-${suffix}` : `s-${suffix}`;
};

export interface PublicNameValidation {
  ok:    boolean;
  value?: string;
  error?: string;
}

/** Trim + lowercase. Always safe to call. */
export const normalizePublicName = (raw: string): string =>
  (raw ?? '').toString().trim().toLowerCase();

/**
 * Validate a candidate publicName. Returns the normalized value on success,
 * or a human-readable error describing the first failing rule.
 */
export const validatePublicName = (raw: string): PublicNameValidation => {
  const value = normalizePublicName(raw);

  if (value.length < MIN_LEN) {
    return { ok: false, error: `Public name must be at least ${MIN_LEN} characters` };
  }
  if (value.length > MAX_LEN) {
    return { ok: false, error: `Public name must be at most ${MAX_LEN} characters` };
  }
  if (!FORMAT.test(value)) {
    return { ok: false, error: 'Only lowercase letters, numbers and single hyphens allowed' };
  }
  if (RESERVED.has(value)) {
    return { ok: false, error: 'This public name is reserved' };
  }

  return { ok: true, value };
};
