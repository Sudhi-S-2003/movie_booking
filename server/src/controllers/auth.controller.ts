import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import { UserRole, AuthProvider, NotificationType } from '../constants/enums.js';
import type { AuthRequest, JwtPayload } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { generateUsernameSuggestions } from '../utils/username.utils.js';
import { getOrCreateForUser as ensureSubscription } from '../services/subscription/subscription.service.js';
import { Session } from '../models/session.model.js';
import { disconnectSessionSockets } from '../socket/index.js';
import { notificationService } from '../services/notification.service.js';
import { generateTotpSecret, verifyTotpToken, generateBackupCodes, hashBackupCodes, verifyAndConsumeBackupCode } from '../utils/totp.utils.js';
import { generateRandomToken } from '../utils/token.utils.js';
import { getClientIp } from '../utils/ip.util.js';
import { generateCaptcha, createCaptchaToken, verifyCaptcha } from '../utils/captcha.utils.js';

const generateToken = (id: string, role: string, sessionId: string) =>
  jwt.sign(
    { id, role, sessionId } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] } as SignOptions
  );

const generateTempToken = (id: string) =>
  jwt.sign(
    { id, is2FAPending: true },
    env.JWT_SECRET,
    { expiresIn: '5m' }
  );

export const register = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password, role, captchaText, captchaToken } = req.body;

    if (!verifyCaptcha(captchaText, captchaToken)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired captcha. Please try again.' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      const suggestions = await generateUsernameSuggestions(username);
      return res.status(400).json({
        success: false,
        message: 'Username already taken. Please try another.',
        suggestions,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: role || UserRole.USER,
      authProvider: AuthProvider.LOCAL,
    });

    await ensureSubscription(user._id.toString()).catch(() => { /* non-fatal */ });

    // Create session
    const refreshToken = generateRandomToken();
    const session = await Session.create({
      userId: user._id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIp(req),
      refreshToken,
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const token = generateToken(user._id.toString(), user.role, session._id.toString());

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: false,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { captchaText, captchaToken } = req.body;

    if (!verifyCaptcha(captchaText, captchaToken)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired captcha. Please try again.' });
    }

    const raw = (req.body?.identifier ?? req.body?.email ?? req.body?.username ?? '')
      .toString()
      .trim();
    const password = req.body?.password;
    if (!raw || !password) {
      return res.status(400).json({ success: false, message: 'Credentials required' });
    }

    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const anchored = new RegExp(`^${escape(raw)}$`, 'i');
    const user = raw.includes('@')
      ? await User.findOne({ email: anchored }).select('+password')
      : await User.findOne({ username: anchored }).select('+password');

    if (!user || user.authProvider !== AuthProvider.LOCAL || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.twoFactorEnabled) {
      const tempToken = generateTempToken(user._id.toString());
      return res.status(200).json({
        success: true,
        requires2FA: true,
        tempToken,
      });
    }

    const refreshToken = generateRandomToken();
    // Create session
    const session = await Session.create({
      userId: user._id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIp(req),
      refreshToken,
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Notify other sessions about the new login
    notificationService.notifyUser(user._id.toString(), 'New Login Detected', `A new device just logged into your account from ${session.userAgent} (${session.ip}).`, {
      severity: 'warning',
      ...session.toObject()
    }, NotificationType.SECURITY_ALERT);

    const token = generateToken(user._id.toString(), user.role, session._id.toString());

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getCaptcha = async (_req: Request, res: Response) => {
  try {
    const { text, captchaSvg } = generateCaptcha();
    const captchaToken = createCaptchaToken(text);

    res.status(200).json({
      success: true,
      captchaToken,
      captchaSvg,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.sessionId) {
      const session = await Session.findById(req.sessionId);
      if (session) {
        session.isValid = false;
        session.refreshToken = undefined as any;
        await session.save();

        // Notify other sessions about the logout
        notificationService.notifyUser(req.user!._id.toString(), 'Session Terminated', `A session from ${session.userAgent} was recently logged out.`, {
          severity: 'info',
          ...session.toObject()
        }, NotificationType.SECURITY_ALERT);
      }
      disconnectSessionSockets(req.sessionId);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const session = await Session.findOne({
      refreshToken,
      isValid: true,
      refreshTokenExpiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Refresh Token Rotation (RTR)
    const newRefreshToken = generateRandomToken();
    session.refreshToken = newRefreshToken;
    session.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Rotate 7 days
    await session.save();

    const token = generateToken(user._id.toString(), user.role, session._id.toString());

    res.status(200).json({
      success: true,
      token,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const setup2FA = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    // Generate TOTP Secret
    const { secret, qrCodeDataUrl } = await generateTotpSecret(user.email, env.APP_NAME || 'CinemaConnect');

    // Save temporary secret to user (not yet enabled)
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = false; // explicitly keep disabled until verified
    await user.save();

    res.status(200).json({
      success: true,
      qrCodeDataUrl,
      secret, // backup manual key
      message: '2FA setup initiated successfully'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const verify2FA = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await User.findById(req.user!._id).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA setup has not been initiated' });
    }

    const isValid = verifyTotpToken(user.twoFactorSecret, code);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedBackupCodes;
    await user.save();

    // Security notification
    notificationService.notifyUser(user._id.toString(), '2FA Enabled', 'Two-Factor Authentication has been successfully enabled on your account.', {
      severity: 'info',
    }, NotificationType.SECURITY_ALERT);

    res.status(200).json({
      success: true,
      backupCodes,
      message: 'Two-Factor Authentication enabled successfully'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await User.findById(req.user!._id).select('+twoFactorSecret +twoFactorBackupCodes');
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled on this account' });
    }

    // Verify TOTP or backup code
    let isCodeValid = verifyTotpToken(user.twoFactorSecret!, code);
    
    if (!isCodeValid && user.twoFactorBackupCodes) {
      const backupVerify = await verifyAndConsumeBackupCode(code, user.twoFactorBackupCodes);
      if (backupVerify.isValid) {
        isCodeValid = true;
        user.twoFactorBackupCodes = backupVerify.remainingCodes as any;
      }
    }

    if (!isCodeValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined as any;
    user.twoFactorBackupCodes = undefined as any;
    await user.save();

    // Security notification
    notificationService.notifyUser(user._id.toString(), '2FA Disabled', 'Two-Factor Authentication has been disabled on your account.', {
      severity: 'warning',
    }, NotificationType.SECURITY_ALERT);

    res.status(200).json({
      success: true,
      message: 'Two-Factor Authentication disabled successfully'
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const complete2FALogin = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    // req.user has been attached by requireTempToken middleware
    const user = req.user as any;
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not active for this request' });
    }

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

    if (!isCodeValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Verification successful! Issue real JWT + refresh token
    const refreshToken = generateRandomToken();
    const session = await Session.create({
      userId: user._id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIp(req),
      refreshToken,
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Notify user
    notificationService.notifyUser(
      user._id.toString(),
      'New Login Verified',
      `A new device successfully logged in with 2FA ${usedBackupCode ? '(using backup code)' : ''} from ${session.userAgent} (${session.ip}).`,
      {
        severity: 'info',
        ...session.toObject()
      },
      NotificationType.SECURITY_ALERT
    );

    const token = generateToken(user._id.toString(), user.role, session._id.toString());

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await Session.find({ 
      userId: req.user!._id,
      isValid: true 
    } as any).sort({ lastActive: -1 });
    
    const sessionsWithCurrent = sessions.map(s => ({
      ...s.toObject(),
      isCurrent: s._id.toString() === req.sessionId
    }));

    res.status(200).json({ success: true, sessions: sessionsWithCurrent });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Users can only revoke their own sessions
    const session = await Session.findOne({ 
      _id: id, 
      userId: req.user!._id 
    } as any);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.isValid = false;
    session.refreshToken = undefined as any;
    await session.save();

    // Notify other sessions about the revocation
    notificationService.notifyUser(req.user!._id.toString(), 'Session Revoked', `A session from ${session.userAgent} was revoked by you.`, {
      severity: 'warning',
      ...session.toObject()
    }, NotificationType.SECURITY_ALERT);

    disconnectSessionSockets(session._id.toString());

    res.status(200).json({ success: true, message: 'Session revoked' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

