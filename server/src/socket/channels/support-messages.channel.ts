import type { Namespace } from 'socket.io';
import { socketAuthMiddleware } from '../socketAuth.middleware.js';

/**
 * Support / Messages channel — per-issue chat room.
 *
 * Authenticated via JWT. User identity comes from `socket.data` (set by
 * socketAuthMiddleware), NOT from client-sent payloads.
 *
 * Room model: `issue:<issueId>`. Clients join when they open the chat
 * panel and leave on close.
 *
 * Events emitted:
 *   - new_reply       — new message persisted
 *   - status_changed  — issue status changed
 *   - receipts_update — read receipts
 */
export const registerSupportMessagesHandlers = (namespace: Namespace) => {
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    console.log(`🎧 [SUPPORT-MSG] Client connected: ${socket.id} (user: ${socket.data.userId as string})`);

    socket.on('join_issue', (issueId: string) => {
      socket.join(`issue:${issueId}`);
      console.log(`🎧 [SUPPORT-MSG] ${socket.id} joined issue: ${issueId}`);
    });

    socket.on('leave_issue', (issueId: string) => {
      socket.leave(`issue:${issueId}`);
      console.log(`🎧 [SUPPORT-MSG] ${socket.id} left issue: ${issueId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [SUPPORT-MSG] Client disconnected: ${socket.id}`);
    });
  });
};

/** Minimal shape required to emit a support reply over the wire. */
export interface WireReply {
  _id:         unknown;
  issueId:     unknown;
  senderId?:   unknown;
  senderName:  string;
  senderRole:  string;
  text:        string;
  attachments: unknown[];
  createdAt:   unknown;
  [key: string]: unknown;
}

/** New reply persisted — broadcast to everyone in the issue room. */
export const emitNewReply = (namespace: Namespace, issueId: string, message: WireReply) => {
  namespace.to(`issue:${issueId}`).emit('new_reply', message);
};

/** Status field changed (OPEN → IN_PROGRESS → ...). */
export const emitStatusChange = (namespace: Namespace, issueId: string, status: string) => {
  namespace.to(`issue:${issueId}`).emit('status_changed', { issueId, status });
};

/**
 * Read-receipt fan-out so the *sender's* tick UI can flip from sent → read
 * without polling. Skipped for the actor themselves on the client side.
 */
export const emitReceipts = (
  namespace: Namespace,
  issueId: string,
  payload: { userId: string; messageIds: string[] },
) => {
  namespace.to(`issue:${issueId}`).emit('receipts_update', { issueId, ...payload });
};
