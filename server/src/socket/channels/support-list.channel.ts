import type { Namespace } from 'socket.io';
import { socketAuthMiddleware } from '../socketAuth.middleware.js';

/**
 * Support / List channel — user-scoped notifications.
 *
 * Authenticated via JWT. The user's room is determined from `socket.data.userId`
 * (set by socketAuthMiddleware), NOT from client-sent payloads.
 *
 * Room model: `user:<userId>`. Auto-joined on connection.
 *
 * Events emitted:
 *   - unread_changed  — badge count update for a specific issue
 *   - issue_updated   — list row update (status, last activity)
 */
export const registerSupportListHandlers = (namespace: Namespace) => {
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    console.log(`📋 [SUPPORT-LIST] Client connected: ${socket.id} (user: ${userId})`);

    // Auto-join user's personal room from auth token — no client-sent userId needed
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 [SUPPORT-LIST] Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Push an unread-count delta for a specific issue to a specific user.
 */
export const emitUnreadChanged = (
  namespace: Namespace,
  userId: string,
  payload: { issueId: string; count: number; lastReadMessageId?: string | null },
) => {
  namespace.to(`user:${userId}`).emit('unread_changed', payload);
};

/**
 * Notify a user that one of their visible tickets had activity.
 */
export const emitIssueListUpdated = (
  namespace: Namespace,
  userId: string,
  payload: { issueId: string; lastActivityAt?: string; status?: string },
) => {
  namespace.to(`user:${userId}`).emit('issue_updated', payload);
};
