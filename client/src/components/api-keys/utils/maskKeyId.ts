/** "ak_AbCdEfGh1234…abcd" — safe to display truncated. */
export const maskKeyId = (keyId: string): string => {
  if (keyId.length <= 12) return keyId;
  return `${keyId.slice(0, 7)}…${keyId.slice(-4)}`;
};

/** Human label for an API key category. */
export const CATEGORY_LABELS: Record<string, string> = {
  chat: 'Chat',
};

/** "2h ago" / "Never used" style label for `lastUsedAt`. */
export const formatLastUsed = (iso: string | null): string => {
  if (!iso) return 'Never used';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)                 return 'just now';
  if (diff < 3_600_000)               return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)              return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000)         return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
