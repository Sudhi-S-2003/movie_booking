import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a new TOTP secret and corresponding QR code.
 */
export const generateTotpSecret = async (email: string, issuer: string) => {
  const secret = speakeasy.generateSecret({
    name: `${issuer}:${email}`,
    issuer: issuer,
    length: 20
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate otpauth URL');
  }

  // Generate QR Code data URL
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32, // store this in base32 format
    otpAuthUrl: secret.otpauth_url,
    qrCodeDataUrl
  };
};

/**
 * Verify a 6-digit TOTP token against the base32 secret.
 */
export const verifyTotpToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1 // allows 1 step (30 seconds) tolerance before and after
  });
};

/**
 * Generate 10 single-use, 8-character backup codes formatted as XXXX-XXXX.
 */
export const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = crypto.randomBytes(4).toString('hex'); // 8 characters
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    codes.push(formatted);
  }
  return codes;
};

/**
 * Hashes an array of plain backup codes using bcrypt.
 */
export const hashBackupCodes = async (codes: string[]): Promise<string[]> => {
  const hashed = await Promise.all(
    codes.map(async (code) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(code, salt);
    })
  );
  return hashed;
};

/**
 * Verifies a plain backup code against an array of hashed backup codes.
 * Returns an object indicating success and the remaining hashed codes list.
 */
export const verifyAndConsumeBackupCode = async (
  plainCode: string,
  hashedCodes: string[]
): Promise<{ isValid: boolean; remainingCodes?: string[] }> => {
  const cleanCode = plainCode.trim().toLowerCase();
  
  for (let i = 0; i < hashedCodes.length; i++) {
    const hash = hashedCodes[i];
    if (!hash) continue;
    const isMatch = await bcrypt.compare(cleanCode, hash);
    if (isMatch) {
      // Consume the code by removing it from the list
      const remainingCodes = [...hashedCodes];
      remainingCodes.splice(i, 1);
      return { isValid: true, remainingCodes };
    }
  }

  return { isValid: false };
};
