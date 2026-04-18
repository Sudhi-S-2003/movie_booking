import { createHmac } from 'node:crypto';
import { env } from '../env.js';

/**
 * Generate an HMAC signature for a conversation ID and an expiration timestamp.
 */
export const signConversation = (conversationId: string, expiresAt: number): string => {
  return createHmac('sha256', env.JWT_SECRET)
    .update(`${conversationId}:${expiresAt}`)
    .digest('hex');
};

/**
 * Verify if a signature matches a conversation ID and hasn't expired.
 */
export const verifyConversationSignature = (
  conversationId: string,
  signature: string,
  expiresAt: number,
): boolean => {
  // Check clock
  if (Date.now() > expiresAt) return false;

  const expected = signConversation(conversationId, expiresAt);
  return expected === signature;
};
