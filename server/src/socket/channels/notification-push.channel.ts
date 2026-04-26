import type { Namespace } from 'socket.io';
import { socketAuthMiddleware } from '../socketAuth.middleware.js';
import { UserRole } from '../../constants/enums.js';

/**
 * Notification Push channel — handles global and role-specific alerts.
 * 
 * Rooms:
 * - 'all'           : Everyone connected.
 * - 'guests'        : Unauthenticated/Signature-only users.
 * - 'authenticated' : Real registered users.
 * - 'admins'        : Admin role only.
 * - 'owners'        : Theatre Owner role only.
 * - 'user_{id}'     : Private room for registered users.
 */
export const registerNotificationHandlers = (namespace: Namespace) => {
  // Use auth middleware to identify the user
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    const { userId, isGuest } = socket.data;
    const userRole = (socket as any).data?.role; // Role might be added to socket data in middleware or fetched

    console.log(`🔌 [NOTIFICATION] Client connected: ${socket.id} (Guest: ${isGuest}, User: ${userId}, Role: ${socket.data.role})`);

    // 1. Everyone joins 'all'
    socket.join('all');

    if (isGuest) {
      // 2. Guests join 'guests'
      socket.join('guests');
    } else {
      // 3. Registered users join 'authenticated' and personal room
      socket.join('authenticated');
      if (userId) {
        socket.join(`user_${userId}`);
      }

    }

    // 4. Role-specific rooms
    if (socket.data.role === UserRole.ADMIN) {
      socket.join('admins');
      console.log(`🛡️ [NOTIFICATION] ${socket.id} joined 'admins' room`);
    } else if (socket.data.role === UserRole.THEATRE_OWNER) {
      socket.join('owners');
      console.log(`🎭 [NOTIFICATION] ${socket.id} joined 'owners' room`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 [NOTIFICATION] Client disconnected: ${socket.id}`);
    });
  });
};
