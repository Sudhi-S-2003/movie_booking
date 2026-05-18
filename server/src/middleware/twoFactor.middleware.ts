import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { User } from '../models/user.model.js';

/**
 * Middleware to require a temporary, valid 2FA pending login token.
 * This is used for completing the login process with the OTP/Backup code.
 */
export const requireTempToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Temporary token required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }
    const decoded = jwt.verify(token, env.JWT_SECRET as string) as any;

    if (!decoded || !decoded.is2FAPending) {
      return res.status(401).json({ success: false, message: 'Invalid temporary token type' });
    }

    const user = await User.findById(decoded.id).select('+twoFactorSecret +twoFactorBackupCodes');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Attach pending user to the request object
    req.user = user as any;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired temporary token' });
  }
};
