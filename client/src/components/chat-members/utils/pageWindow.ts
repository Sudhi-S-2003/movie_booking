/**
 * Condensed page-number window used by both the members list and the
 * in-modal search pagination.
 *
 * Always shows first, last, current, and two neighbours, with "…" gaps
 * when the list is long. Returns an array of numbers and the literal
 * '…' sentinel so callers can render gaps deterministically.
 */
export const buildPageWindow = (
  current: number,
  totalPages: number,
): Array<number | '…'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const window: Array<number | '…'> = [1];
  const start = Math.max(2, current - 1);
  const end   = Math.min(totalPages - 1, current + 1);

  if (start > 2)            window.push('…');
  for (let i = start; i <= end; i++) window.push(i);
  if (end < totalPages - 1) window.push('…');

  window.push(totalPages);
  return window;
};
