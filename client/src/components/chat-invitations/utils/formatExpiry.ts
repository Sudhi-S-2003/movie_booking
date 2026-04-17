/**
 * Format an expiry timestamp into a short human string.
 *   "expired"       — already past
 *   "in 3d 4h"      — upcoming
 *   "never"         — null (non-expiring invite)
 */
export const formatExpiry = (iso: string | null): string => {
  if (!iso) return 'never';

  const expiresAt = new Date(iso).getTime();
  if (Number.isNaN(expiresAt)) return '—';

  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return 'expired';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60)       return `in ${minutes}m`;
  const hours   = Math.floor(minutes / 60);
  if (hours < 24)         return `in ${hours}h`;
  const days    = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `in ${days}d ${remHours}h` : `in ${days}d`;
};

/** "3 / 10 uses", "3 uses", etc. */
export const formatUses = (used: number, max: number | null): string =>
  max === null ? `${used} use${used === 1 ? '' : 's'}` : `${used} / ${max} uses`;
