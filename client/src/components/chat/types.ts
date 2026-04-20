// ─── Chat Types ──────────────────────────────────────────────────────────────

export type ConversationType = 'direct' | 'group' | 'system' | 'api';
export type ChatContentType =
  | 'text'
  | 'emoji'
  | 'contact'
  | 'location'
  | 'image'
  | 'file'
  | 'system'
  | 'date'
  | 'event'
  | 'longtext';

export interface ChatContactPayload {
  name?:       string;
  phone:       string;
  countryCode: string;
}

export interface ChatLocationPayload {
  lat:    number;
  lng:    number;
  label?: string;
}

export interface ChatDatePayload {
  iso:    string;
  label?: string;
}

export interface ChatEventPayload {
  title:        string;
  startsAt:     string;
  endsAt?:      string;
  location?:    string;
  description?: string;
}

export type DeliveryStatus   = 'sent' | 'read';

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
  externalUser?:     { name: string; email: string };
  createdAt:         string;
  updatedAt:         string;
}

export interface ChatMessage {
  _id:            string;
  conversationId: string;
  senderId?:      string | null;
  senderName:     string;
  contentType:    ChatContentType;
  text:           string;
  attachments:    string[];
  emoji?:         string;
  contact?:       ChatContactPayload;
  location?:      ChatLocationPayload;
  date?:          ChatDatePayload;
  event?:         ChatEventPayload;
  /** longtext: id of the first chunk (the chunk AFTER the preview). */
  startChunkId?:  string;
  /** longtext: id of the last chunk — UI stops fetching once this lands. */
  endChunkId?:    string;
  /** longtext: total chars (preview + all chunks). Drives "+X more" label. */
  fullLength?:    number;
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
  conversationId:   string;
  userId?:           string;
  externalUserName?: string;
  messageIds:        string[];
  readAt:            string;
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
