import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../env.js';
import { User } from '../models/user.model.js';
import type { JwtPayload } from '../interfaces/auth.interface.js';

/**
 * Socket.io authentication middleware.
 *
 * Clients pass the JWT via `socket.handshake.auth.token`. On success the
 * socket is decorated with `socket.data.userId` and `socket.data.userName`
 * so downstream handlers never need to trust client-sent user IDs.
 *
 * Usage:
 *   namespace.use(socketAuthMiddleware);
 *   namespace.on('connection', (socket) => {
 *     const userId = socket.data.userId; // guaranteed string
 *   });
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.id).select('_id name username role').lean();
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach to socket.data — available in all event handlers
    socket.data.userId   = String(user._id);
    socket.data.userName = user.name;

    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};
