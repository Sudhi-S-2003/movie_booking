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

/**
 * Sign an ID (like an integration ID) along with a timestamp for secure use in URLs.
 */
export const signId = (id: string, timestamp: string | number): string => {
  return createHmac('sha256', env.JWT_SECRET)
    .update(`id:${id}:${timestamp}`)
    .digest('hex')
    .slice(0, 16); // Shortened for cleaner URLs, still high entropy
};

/**
 * Verify if a signature matches an ID and a specific timestamp.
 */
export const verifyIdSignature = (id: string, signature: string, timestamp: string | number): boolean => {
  const expected = signId(id, timestamp);
  return expected === signature;
};

