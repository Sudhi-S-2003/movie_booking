import type { Namespace } from 'socket.io';
import { socketAuthMiddleware } from '../socketAuth.middleware.js';

/**
 * Chat / Messages channel — per-conversation room.
 *
 * Authenticated via JWT. User identity comes from `socket.data` (set by
 * socketAuthMiddleware), NOT from client-sent payloads.
 *
 * Room model: `conv:<conversationId>`. Clients join when opening a chat
 * and leave on close. Events: new messages, typing indicators, receipts.
 */
export const registerChatMessagesHandlers = (namespace: Namespace) => {
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    const userId   = socket.data.userId as string;
    const userName = socket.data.userName as string;
    console.log(`💬 [CHAT-MSG] Client connected: ${socket.id} (user: ${userId})`);

    socket.on('join_conversation', (conversationId: string) => {
      // Security: if guest, verify they are joining the conversation they have a signature for.
      if (socket.data.isGuest && socket.data.allowedConversationId !== conversationId) {
        console.warn(`⚠️ [CHAT-MSG] Guest ${socket.id} attempted to join unauthorized room: ${conversationId}`);
        return;
      }
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Typing — use server-side user identity, ignore client-sent userId/name
    socket.on('typing', (payload: { conversationId: string }) => {
      socket.to(`conv:${payload.conversationId}`).emit('user_typing', {
        conversationId: payload.conversationId,
        userId:         socket.data.userId, // May be null for guests
        name:           socket.data.userName,
      });
    });

    socket.on('stop_typing', (payload: { conversationId: string }) => {
      socket.to(`conv:${payload.conversationId}`).emit('user_stop_typing', {
        conversationId: payload.conversationId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [CHAT-MSG] Client disconnected: ${socket.id}`);
    });
  });
};

/** Minimal shape required to emit a chat message over the wire. */
interface WireMessage {
  _id:            unknown;
  conversationId: unknown;
  senderId?:      unknown;
  senderName:     string;
  contentType:    string;
  text:           string;
  attachments:    unknown[];
  emoji?:         string;
  contact?:       { name?: string; phone: string; countryCode: string };
  location?:      { lat: number; lng: number; label?: string };
  isSystem:       boolean;
  createdAt:      unknown;
  [key: string]:  unknown;
}

/** New message — broadcast to everyone in the conversation room. */
export const emitNewMessage = (namespace: Namespace, conversationId: string, message: WireMessage) => {
  namespace.to(`conv:${conversationId}`).emit('new_message', message);
};

/** Read receipts — sender's UI flips ticks from sent → read for a specific set of messages. */
export const emitChatReceipts = (
  namespace: Namespace,
  conversationId: string,
  payload: {
    userId?:          string | undefined;
    externalUserName?: string | undefined;
    messageIds:       string[];
    readAt:           string;
  },
) => {
  namespace.to(`conv:${conversationId}`).emit('receipts_update', { conversationId, ...payload });
};

/** Message deleted */
export const emitMessageDeleted = (
  namespace: Namespace,
  conversationId: string,
  messageId: string,
) => {
  namespace.to(`conv:${conversationId}`).emit('message_deleted', { conversationId, messageId });
};
