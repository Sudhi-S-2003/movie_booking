/**
 * Convert a raw hashtag string to a URL-safe slug.
 * Strips leading `#`, lowercases, replaces non-alphanumeric chars with hyphens.
 */
export const toSlug = (s: string): string =>
  s.toLowerCase().trim().replace(/^#+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
