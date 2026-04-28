import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import { Conversation } from '../models/chat.model.js';
import { verifyConversationSignature } from '../utils/signature.util.js';
import type { JwtPayload } from '../interfaces/auth.interface.js';

import { Session } from '../models/session.model.js';

/**
 * Socket.io authentication middleware.
 *
 * Clients pass the JWT via `socket.handshake.auth.token`. On success the
 * socket is decorated with `socket.data.userId`, `socket.data.userName`, 
 * and `socket.data.sessionId` so downstream handlers never need to trust 
 * client-sent identities.
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const auth = socket.handshake.auth || {};
    const token     = auth.token as string | undefined;
    const signature = auth.signature as string | undefined;
    const expiresAt = auth.expiresAt ? Number(auth.expiresAt) : undefined;
    const convId    = auth.conversationId as string | undefined;

    // 1. Try JWT Auth first
    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      
      // Verify session exists and is valid
      const session = await Session.findOne({
        _id: decoded.sessionId,
        userId: decoded.id,
        isValid: true
      });

      if (!session) {
        return next(new Error('Session expired or revoked. Please login again.'));
      }

      const user = await User.findById(decoded.id).select('_id name username role').lean();
      if (!user) return next(new Error('User not found'));

      socket.data.userId    = String(user._id);
      socket.data.userName  = user.name;
      socket.data.role      = user.role;
      socket.data.sessionId = String(session._id);
      socket.data.isGuest   = false;
      return next();
    }

    // 2. Try Guest (Signature) Auth
    if (signature && expiresAt && convId) {
      const isValid = verifyConversationSignature(convId, signature, expiresAt);
      if (!isValid) return next(new Error('Invalid or expired signature'));

      const conversation = await Conversation.findById(convId).lean();
      if (!conversation) return next(new Error('Conversation not found'));

      // Guest identity
      socket.data.userId               = null; // No registered user
      socket.data.userName             = conversation.externalUser?.name || 'Guest';
      socket.data.isGuest              = true;
      socket.data.allowedConversationId = convId;
      return next();
    }

    return next(new Error('Authentication required'));
  } catch (e: any) {
    next(new Error(`Socket Auth Error: ${e.message || 'Unknown'}`));
  }
};
