import { EmitterSocket } from '../emitter-socket.js';

/**
 * Chat list socket — user-scoped conversation list events.
 * JWT-authenticated: server auto-joins the user's room from the token.
 * No client-sent userId needed.
 * Events: unread_changed, conversation_updated, new_conversation
 */
class ChatListSocketService extends EmitterSocket {
  constructor() {
    super('/chat-list', true); // authenticated
    this.forward('unread_changed');
    this.forward('conversation_updated');
    this.forward('new_conversation');
  }
}

export const chatListSocket = new ChatListSocketService();
