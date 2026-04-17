/**
 * Format an ISO timestamp as a compact "Mar 14, 2026" for member rows.
 * Falls back to an em-dash on invalid input so rendering never throws.
 */
export const formatJoinDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });
  } catch {
    return '—';
  }
};
