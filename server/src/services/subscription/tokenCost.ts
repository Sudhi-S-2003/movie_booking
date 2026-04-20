/**
 * Token cost formula — one pure function. `Math.max(1, Math.ceil(len / 4))`.
 * A single character still costs one token so empty-ish messages can't be free.
 */
export const computeTokenCost = (text: string): number => {
  const len = typeof text === 'string' ? text.length : 0;
  return Math.max(1, Math.ceil(len / 4));
};

/**
 * Variant that skips constructing a string when the caller already knows the
 * authoritative character count (e.g. longtext uploads where the length is
 * summed from persisted chunks). Mirrors `computeTokenCost`'s formula so a
 * given length always bills the same regardless of which entry point is used.
 */
export const tokenCostForLength = (len: number): number => {
  const safe = typeof len === 'number' && Number.isFinite(len) && len > 0 ? Math.floor(len) : 0;
  return Math.max(1, Math.ceil(safe / 4));
};
