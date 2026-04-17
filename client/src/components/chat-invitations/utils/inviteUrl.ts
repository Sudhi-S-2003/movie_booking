/**
 * Build the absolute URL for an invite token. The preview page at
 * `/chat/invite/:token` is public (anyone can open it) — the accept step
 * requires auth.
 */
export const buildInviteUrl = (token: string): string => {
  const origin = typeof window !== 'undefined' && window.location
    ? window.location.origin
    : '';
  return `${origin}/chat/invite/${token}`;
};

/** Absolute URL for a conversation's public social page. */
export const buildPublicChatUrl = (publicName: string): string => {
  const origin = typeof window !== 'undefined' && window.location
    ? window.location.origin
    : '';
  return `${origin}/chat/g/${publicName}`;
};
