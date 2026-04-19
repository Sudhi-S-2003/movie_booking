/**
 * Token cost formula — one pure function. `Math.max(1, Math.ceil(len / 4))`.
 * A single character still costs one token so empty-ish messages can't be free.
 */
export const computeTokenCost = (text: string): number => {
  const len = typeof text === 'string' ? text.length : 0;
  return Math.max(1, Math.ceil(len / 4));
};
