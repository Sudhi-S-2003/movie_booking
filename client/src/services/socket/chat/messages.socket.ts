import { EmitterSocket } from '../emitter-socket.js';

/**
 * Chat messages socket — per-conversation events.
 * JWT-authenticated: server identifies user from token, not client payloads.
 * Events: new_message, receipts_update, user_typing, user_stop_typing, message_deleted
 *
 * On reconnect: automatically re-joins the current conversation room so events
 * are not missed after a temporary disconnect.
 */
class ChatMessagesSocketService extends EmitterSocket {
  private currentConversationId: string | null = null;

  constructor() {
    super('/chat-messages', true); // authenticated
    this.forward('new_message');
    this.forward('receipts_update');
    this.forward('user_typing');
    this.forward('user_stop_typing');
    this.forward('message_deleted');

    // Re-join conversation room after reconnect
    this.onReconnect(() => {
      if (this.currentConversationId) {
        this.socket.emit('join_conversation', this.currentConversationId);
      }
    });
  }

  joinConversation(conversationId: string) {
    if (this.currentConversationId === conversationId) return;
    if (this.currentConversationId) {
      this.leaveConversation(this.currentConversationId);
    }
    this.currentConversationId = conversationId;
    this.socket.emit('join_conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    this.socket.emit('leave_conversation', conversationId);
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }

  /** Send typing — only conversationId needed; server adds user identity from JWT. */
  sendTyping(conversationId: string) {
    this.socket.emit('typing', { conversationId });
  }

  sendStopTyping(conversationId: string) {
    this.socket.emit('stop_typing', { conversationId });
  }
}

export const chatMessagesSocket = new ChatMessagesSocketService();
