import type { Namespace } from 'socket.io';
import { socketAuthMiddleware } from '../socketAuth.middleware.js';

/**
 * Chat / List channel — user-scoped conversation list events.
 *
 * Authenticated via JWT. The user's room is determined from `socket.data.userId`
 * (set by socketAuthMiddleware), NOT from client-sent payloads.
 *
 * Room model: `user:<userId>`. Auto-joined on connection.
 */
export const registerChatListHandlers = (namespace: Namespace) => {
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    console.log(`📋 [CHAT-LIST] Client connected: ${socket.id} (user: ${userId})`);

    // Auto-join user's personal room from auth token — no client-sent userId needed
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 [CHAT-LIST] Client disconnected: ${socket.id}`);
    });
  });
};

/** Badge update for a specific conversation. */
export const emitChatUnreadChanged = (
  namespace: Namespace,
  userId: string,
  payload: { conversationId: string; count: number; lastReadMessageId?: string | null },
) => {
  namespace.to(`user:${userId}`).emit('unread_changed', payload);
};

/** Conversation list item changed (new message preview, last activity). */
export const emitConversationUpdated = (
  namespace: Namespace,
  userId: string,
  payload: {
    conversationId:    string;
    lastMessageAt?:    string;
    lastMessageText?:  string;
    lastMessageSender?: string;
    messageCount?:     number;
  },
) => {
  namespace.to(`user:${userId}`).emit('conversation_updated', payload);
};

/**
 * Minimal shape of a conversation item emitted to the list channel.
 *
 * Emitters populate `participants` via the ConversationParticipant collection
 * before broadcasting so clients continue to receive a ready-to-render roster.
 */
export interface WireConversation {
  _id:                unknown;
  type:               string;
  participants:       unknown[];
  messageCount:       number;
  isActive:           boolean;
  [key: string]:      unknown;
}

/** A new conversation was created that includes this user. */
export const emitNewConversation = (
  namespace: Namespace,
  userId: string,
  conversation: WireConversation,
) => {
  namespace.to(`user:${userId}`).emit('new_conversation', conversation);
};
