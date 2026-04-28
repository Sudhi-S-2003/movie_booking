import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import { UserRole, AuthProvider, NotificationType } from '../constants/enums.js';
import type { AuthRequest, JwtPayload } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { getOrCreateForUser as ensureSubscription } from '../services/subscription/subscription.service.js';
import { Session } from '../models/session.model.js';
import { disconnectSessionSockets } from '../socket/index.js';
import { notificationService } from '../services/notification.service.js';

const generateToken = (id: string, role: string, sessionId: string) =>
  jwt.sign(
    { id, role, sessionId } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] } as SignOptions
  );

export const register = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password, role } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken. Please try another.' });
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
    const session = await Session.create({
      userId: user._id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
    });

    const token = generateToken(user._id.toString(), user.role, session._id.toString());

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
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

    // Create session
    const session = await Session.create({
      userId: user._id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || 'unknown',
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
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.sessionId) {
      const session = await Session.findById(req.sessionId);
      if (session) {
        session.isValid = false;
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

export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await Session.find({ 
      userId: req.user!._id,
      isValid: true 
    }).sort({ lastActive: -1 });
    
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
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.isValid = false;
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
