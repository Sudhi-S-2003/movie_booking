import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import mongoose from 'mongoose';
import { UserRole, UserStatus, AuthProvider } from '../../constants/enums.js';
import { Session } from '../../models/session.model.js';
import { generateUsernameSuggestions } from '../../utils/username.utils.js';

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

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  password: string;
  /** Optional reseller signup code — attaches the new account to that reseller. */
  resellerCode?: string | undefined;
}

/**
 * Self-registration. Always creates a plain `user`; the role is never taken
 * from input. A valid reseller code places the account under that reseller.
 */
export const createUser = async (input: CreateUserInput) => {
  let parentId: mongoose.Types.ObjectId | null = null;
  let ancestors: mongoose.Types.ObjectId[] = [];
  if (input.resellerCode) {
    const reseller = await User.findOne({
      resellerCode: input.resellerCode.trim().toLowerCase(),
      role: { $in: [UserRole.RESELLER, UserRole.SUPER_ADMIN] },
      status: UserStatus.ACTIVE,
    }).select('_id ancestors');
    if (!reseller) throw new Error('Invalid reseller code');
    parentId = reseller._id as mongoose.Types.ObjectId;
    ancestors = [...(reseller.ancestors as mongoose.Types.ObjectId[]), parentId];
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);
  return User.create({
    name: input.name,
    username: input.username,
    email: input.email,
    password: hashedPassword,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    parentId,
    ancestors,
    authProvider: AuthProvider.LOCAL,
  });
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
  if (user && user.status !== UserStatus.ACTIVE) return null;
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
