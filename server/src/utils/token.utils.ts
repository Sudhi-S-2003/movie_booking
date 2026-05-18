import crypto from 'crypto';

/**
 * Generate a cryptographically secure, high-entropy random token.
 * Since this is an opaque string with no user details, it is perfect for Refresh Tokens.
 */
export const generateRandomToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};
