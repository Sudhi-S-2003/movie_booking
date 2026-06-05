import type { Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import { UserRole, AuthProvider, NotificationType } from '../constants/enums.js';
import type { AuthRequest, JwtPayload } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { disconnectSessionSockets } from '../socket/index.js';
import { notificationService } from '../services/notification.service.js';
import { getClientIp } from '../utils/ip.util.js';
import { generateCaptcha, createCaptchaToken, verifyCaptcha } from '../utils/captcha.utils.js';
import * as AuthService from '../services/auth/auth.service.js';

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

    const existingEmail = await AuthService.checkExistingEmail(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const existingUsername = await AuthService.checkExistingUsername(username);
    if (existingUsername) {
      const suggestions = await AuthService.generateUsernameOpts(username);
      return res.status(400).json({
        success: false,
        message: 'Username already taken. Please try another.',
        suggestions,
      });
    }

    const user = await AuthService.createUser({ name, username, email, password, role });

    const { session, refreshToken } = await AuthService.createSession(
      user._id,
      req.headers['user-agent'] || 'unknown',
      getClientIp(req)
    );

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

    const user = await AuthService.findUserByCredentials(raw);
    if (!user || user.authProvider !== AuthProvider.LOCAL || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await AuthService.verifyPassword(password, user.password);
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

    const { session, refreshToken } = await AuthService.createSession(
      user._id,
      req.headers['user-agent'] || 'unknown',
      getClientIp(req)
    );

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
    const { text, captchaImage } = await generateCaptcha();
    const captchaToken = createCaptchaToken(text);

    res.status(200).json({
      success: true,
      captchaToken,
      captchaImage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.sessionId) {
      const session = await AuthService.endSession(req.sessionId);
      if (session) {
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

    const result = await AuthService.refreshSessionToken(refreshToken);
    if (!result) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const { session, user, newRefreshToken } = result;
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
    const { secret, qrCodeDataUrl } = await AuthService.generate2FASecretForUser(user);

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

    const { user, backupCodes } = await AuthService.verifyAndEnable2FA(req.user!._id, code);

    // Security notification
    notificationService.notifyUser(user._id.toString(), '2FA Enabled', 'Two-Factor Authentication has been successfully enabled on your account.', {
      severity: 'info',
    }, NotificationType.SECURITY_ALERT);

    res.status(200).json({
      success: true,
      backupCodes,
      message: 'Two-Factor Authentication enabled successfully'
    });
  } catch (error: any) {
    res.status(error.message.includes('Invalid') ? 400 : 500).json({ success: false, message: error.message || getErrorMessage(error) });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await AuthService.verifyAndDisable2FA(req.user!._id, code);

    // Security notification
    notificationService.notifyUser(user._id.toString(), '2FA Disabled', 'Two-Factor Authentication has been disabled on your account.', {
      severity: 'warning',
    }, NotificationType.SECURITY_ALERT);

    res.status(200).json({
      success: true,
      message: 'Two-Factor Authentication disabled successfully'
    });
  } catch (error: any) {
    res.status(error.message.includes('Invalid') ? 400 : 500).json({ success: false, message: error.message || getErrorMessage(error) });
  }
};

export const complete2FALogin = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = req.user as any;
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not active for this request' });
    }

    const { usedBackupCode } = await AuthService.verify2FACodeForLogin(user, code);

    const { session, refreshToken } = await AuthService.createSession(
      user._id,
      req.headers['user-agent'] || 'unknown',
      getClientIp(req)
    );

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
  } catch (error: any) {
    res.status(error.message.includes('Invalid') ? 400 : 500).json({ success: false, message: error.message || getErrorMessage(error) });
  }
};

export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await AuthService.getUserActiveSessions(req.user!._id, req.sessionId);
    res.status(200).json({ success: true, sessions });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await AuthService.revokeUserSession(id, req.user!._id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

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
    const user = await AuthService.getUserById(req.user!.id);
    res.status(200).json({ success: true, user });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
