// ─── Chat Types ──────────────────────────────────────────────────────────────

export type ConversationType = 'direct' | 'group' | 'system';
export type ChatMessageType  = 'text' | 'image' | 'file' | 'system';
export type DeliveryStatus   = 'sent' | 'delivered' | 'read';

export interface ChatParticipant {
  _id:       string;
  name:      string;
  username:  string;
  avatar?:   string;
}

/**
 * Lightweight handle to the opposite participant of a direct conversation.
 * Attached server-side by `attachDirectPeer`. Undefined for group / system
 * rows and for detail-fetched direct chats (those populate `.participants`
 * the long way via `populateMembers`).
 */
export interface DirectPeer {
  _id:       string;
  name:      string;
  username:  string;
  avatar?:   string;
}

export interface Conversation {
  _id:               string;
  type:              ConversationType;

  /** Only set on direct (1:1) conversations coming from the list endpoint. */
  peer?:             DirectPeer;
  participantCount:  number;
  title?:            string;
  avatarUrl?:        string;
  createdBy?:        string;
  lastMessageId?:    string;
  lastMessageAt?:    string;
  lastMessageText?:  string;
  lastMessageSender?: string;
  messageCount:      number;
  isActive:          boolean;
  createdAt:         string;
  updatedAt:         string;
}

export interface ChatMessage {
  _id:            string;
  conversationId: string;
  senderId?:      string | null;
  senderName:     string;
  messageType:    ChatMessageType;
  text:           string;
  attachments:    string[];
  replyTo?: {
    messageId:  string;
    senderName: string;
    text:       string;
  };
  isSystem:       boolean;
  isYou?:         boolean;
  deliveryStatus?: DeliveryStatus;
  /** Optimistic send status */
  _status?:       'sending' | 'failed';
  createdAt:      string;
}

export interface ReceiptsUpdate {
  conversationId: string;
  userId:         string;
  messageIds:     string[];
}

export interface TypingEvent {
  conversationId: string;
  userId:         string;
  name:           string;
}

export interface SearchedUser {
  _id:       string;
  name:      string;
  username:  string;
  avatar?:   string;
  bio?:      string;
}
