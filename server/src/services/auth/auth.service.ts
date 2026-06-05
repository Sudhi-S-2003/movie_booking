import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { UserRole, AuthProvider } from '../../constants/enums.js';
import { Session } from '../../models/session.model.js';
import { generateUsernameSuggestions } from '../../utils/username.utils.js';
import { getOrCreateForUser as ensureSubscription } from '../subscription/subscription.service.js';

import { generateTotpSecret, verifyTotpToken, generateBackupCodes, hashBackupCodes, verifyAndConsumeBackupCode } from '../../utils/totp.utils.js';
import { generateRandomToken } from '../../utils/token.utils.js';
import { env } from '../../env.js';

export const checkExistingEmail = async (email: string) => {
  return User.findOne({ email });
};

export const checkExistingUsername = async (username: string) => {
  return User.findOne({ username });
};

export const generateUsernameOpts = async (username: string) => {
  return generateUsernameSuggestions(username);
};

export const createUser = async (userData: any) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const user = await User.create({
    name: userData.name,
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    role: userData.role || UserRole.USER,
    authProvider: AuthProvider.LOCAL,
  });

  await ensureSubscription(user._id.toString()).catch(() => { /* non-fatal */ });
  return user;
};

export const createSession = async (userId: any, userAgent: string, ip: string) => {
  const refreshToken = generateRandomToken();
  const session = await Session.create({
    userId,
    userAgent,
    ip,
    refreshToken,
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
  return { session, refreshToken };
};

export const findUserByCredentials = async (rawIdentifier: string) => {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anchored = new RegExp(`^${escape(rawIdentifier)}$`, 'i');
  return rawIdentifier.includes('@')
    ? User.findOne({ email: anchored }).select('+password')
    : User.findOne({ username: anchored }).select('+password');
};

export const getUserById = async (id: any) => {
  return User.findById(id).select('-password');
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const endSession = async (sessionId: string) => {
  const session = await Session.findById(sessionId);
  if (session) {
    session.isValid = false;
    session.refreshToken = undefined as any;
    await session.save();
    return session;
  }
  return null;
};

export const refreshSessionToken = async (refreshToken: string) => {
  const session = await Session.findOne({
    refreshToken,
    isValid: true,
    refreshTokenExpiresAt: { $gt: new Date() }
  });

  if (!session) return null;

  const user = await User.findById(session.userId);
  if (!user) return null;

  const newRefreshToken = generateRandomToken();
  session.refreshToken = newRefreshToken;
  session.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await session.save();

  return { session, user, newRefreshToken };
};

export const generate2FASecretForUser = async (user: any) => {
  const { secret, qrCodeDataUrl } = await generateTotpSecret(user.email, env.APP_NAME || 'CinemaConnect');
  user.twoFactorSecret = secret;
  user.twoFactorEnabled = false;
  await user.save();
  return { secret, qrCodeDataUrl };
};

export const verifyAndEnable2FA = async (userId: any, code: string) => {
  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA setup has not been initiated');
  }

  const isValid = verifyTotpToken(user.twoFactorSecret, code);
  if (!isValid) throw new Error('Invalid verification code');

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = await hashBackupCodes(backupCodes);

  user.twoFactorEnabled = true;
  user.twoFactorBackupCodes = hashedBackupCodes;
  await user.save();

  return { user, backupCodes };
};

export const verifyAndDisable2FA = async (userId: any, code: string) => {
  const user = await User.findById(userId).select('+twoFactorSecret +twoFactorBackupCodes');
  if (!user || !user.twoFactorEnabled) {
    throw new Error('2FA is not enabled on this account');
  }

  let isCodeValid = verifyTotpToken(user.twoFactorSecret!, code);
  
  if (!isCodeValid && user.twoFactorBackupCodes) {
    const backupVerify = await verifyAndConsumeBackupCode(code, user.twoFactorBackupCodes);
    if (backupVerify.isValid) {
      isCodeValid = true;
      user.twoFactorBackupCodes = backupVerify.remainingCodes as any;
    }
  }

  if (!isCodeValid) throw new Error('Invalid verification code');

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined as any;
  user.twoFactorBackupCodes = undefined as any;
  await user.save();

  return user;
};

export const verify2FACodeForLogin = async (user: any, code: string) => {
  let isCodeValid = verifyTotpToken(user.twoFactorSecret!, code);
  let usedBackupCode = false;

  if (!isCodeValid && user.twoFactorBackupCodes) {
    const backupVerify = await verifyAndConsumeBackupCode(code, user.twoFactorBackupCodes);
    if (backupVerify.isValid) {
      isCodeValid = true;
      usedBackupCode = true;
      user.twoFactorBackupCodes = backupVerify.remainingCodes as any;
      await user.save();
    }
  }

  if (!isCodeValid) throw new Error('Invalid verification code');

  return { usedBackupCode };
};

export const getUserActiveSessions = async (userId: any, currentSessionId?: string) => {
  const sessions = await Session.find({ 
    userId,
    isValid: true 
  } as any).sort({ lastActive: -1 });
  
  return sessions.map(s => ({
    ...s.toObject(),
    isCurrent: s._id.toString() === currentSessionId
  }));
};

export const revokeUserSession = async (sessionId: string, userId: any) => {
  const session = await Session.findOne({ 
    _id: sessionId, 
    userId 
  } as any);

  if (!session) return null;

  session.isValid = false;
  session.refreshToken = undefined as any;
  await session.save();
  return session;
};
