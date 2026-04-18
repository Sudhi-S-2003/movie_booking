// ─────────────────────────────────────────────────────────────────────────────
// Chat domain models
//
// Three collections power the general-purpose chat system:
//
//   1. Conversation    — a container for messages (direct, group, or system)
//   2. ChatMessage     — individual messages within a conversation (1:N)
//   3. ChatReadCursor  — per-(user, conversation) "last read" pointer
//
// Conversation types:
//   - direct  : 1-on-1 between two users. Exactly 2 participants.
//   - group   : multi-user chat. 2+ participants, has a title.
//   - system  : one-way notifications (OTP, booking confirmations, etc.)
//               No reply allowed; system is the "sender". Single recipient.
//
// Design mirrors the issue chat system (cursor-based reads, composite-cursor
// pagination) but is decoupled so the two can evolve independently.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document } from 'mongoose';

// ─── Conversation ────────────────────────────────────────────────────────────

/**
 * Conversation type.
 *
 *   direct  — 1-on-1 between two real users
 *   group   — multi-user chat with a title + public slug
 *   system  — one-way platform notifications (OTP, booking confirmations, …)
 *   api     — programmatic channel driven by a user's API key. Hidden from
 *             the regular conversation list; surfaced on its own management
 *             screen.
 */
export type ConversationType = 'direct' | 'group' | 'system' | 'api';

export interface ConversationDoc extends Document {
  type:          ConversationType;
  title?:        string;            // group name (group/system only)
  avatarUrl?:    string;            // group avatar
  createdBy?:    mongoose.Types.ObjectId;
  /**
   * Human-friendly unique identifier for public sharing (similar to a slug).
   * When set, the conversation is resolvable at `/chat/g/:publicName`. Only
   * meaningful for group conversations; direct/system conversations never
   * expose one.
   */
  publicName?:       string;
  externalUser?: {
    name:  string;
    email: string;
  };
  /**
   * Denormalized member count. Authoritative source is the
   * `ConversationParticipant` collection; this field is kept in sync on every
   * membership mutation via `conversationParticipants.service.ts`, so hot
   * read paths (read-consensus, receipts) can avoid an extra round-trip.
   */
  participantCount:  number;
  lastMessageId?:    mongoose.Types.ObjectId;
  lastMessageAt?:    Date;
  lastMessageText?:  string;        // preview snippet
  lastMessageSender?: string;       // sender name for preview
  messageCount:  number;
  isActive:      boolean;           // soft-close for system conversations
  createdAt:     Date;
  updatedAt:     Date;
}

const ConversationSchema = new Schema<ConversationDoc>(
  {
    type: {
      type:     String,
      enum:     ['direct', 'group', 'system', 'api'],
      required: true,
    },
    title:     { type: String, trim: true },
    avatarUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    publicName: {
      type:      String,
      trim:      true,
      lowercase: true,
      required:  true, // every conversation carries a slug (auto-generated for direct/system)
    },
    externalUser: {
      _id:   false,
      name:  { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    participantCount: { type: Number, default: 0, min: 0 },

    // Denormalized last-message fields for fast list rendering.
    lastMessageId:     { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    lastMessageAt:     { type: Date },
    lastMessageText:   { type: String },
    lastMessageSender: { type: String },

    messageCount: { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Sort my conversation list by last activity (after joining to membership).
ConversationSchema.index({ lastMessageAt: -1 });
// Unique public identifier — partial so only conversations that opted in
// occupy the namespace.
ConversationSchema.index(
  { publicName: 1 },
  { unique: true, partialFilterExpression: { publicName: { $type: 'string' } } },
);
// For system-conversation dedup (one bucket per recipient + title). The
// per-recipient gate happens application-side via ConversationParticipant.
ConversationSchema.index({ type: 1, title: 1 });
// For API-driven conversation dedup (one bucket per owner + external email).
ConversationSchema.index(
  { type: 1, createdBy: 1, 'externalUser.email': 1 },
  { unique: true, partialFilterExpression: { type: 'api' } },
);

// ─── ChatMessage ─────────────────────────────────────────────────────────────

export type ChatMessageType = 'text' | 'image' | 'file' | 'system';

export interface ChatMessageDoc extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId?:      mongoose.Types.ObjectId;  // null for system messages
  senderName:     string;
  messageType:    ChatMessageType;
  text:           string;
  attachments:    string[];
  replyTo?: {
    messageId:  mongoose.Types.ObjectId;
    senderName: string;
    text:       string;
  };
  isSystem:  boolean;                       // true for auto-generated messages
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<ChatMessageDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId:       { type: Schema.Types.ObjectId, ref: 'User' },
    senderName:     { type: String, required: true },
    messageType:    { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
    text:           { type: String, required: true },
    attachments:    [{ type: String }],
    replyTo: {
      messageId:  { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
      senderName: { type: String },
      text:       { type: String },
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Composite cursor pagination — loadOlder (default)
ChatMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
// Composite cursor pagination — loadNewer
ChatMessageSchema.index({ conversationId: 1, createdAt: 1, _id: 1 });

// ─── ConversationParticipant ────────────────────────────────────────────────
//
// One document per (conversationId, userId) — the canonical membership record.
// Lets us paginate members of a large group without scanning the array on the
// Conversation document, and gives us a stable `joinedAt` to sort by.
//
// The embedded `participants` array on Conversation is retained as a
// denormalized projection so hot paths (unread fan-out, direct-pair lookup)
// keep their single-document reads. Write-through keeps the two in sync; the
// members endpoint treats this collection as the source of truth.

export interface ConversationParticipantDoc extends Document {
  conversationId: mongoose.Types.ObjectId;
  userId:         mongoose.Types.ObjectId;
  role:           'owner' | 'member';
  addedBy?:       mongoose.Types.ObjectId;
  joinedAt:       Date;
}

const ConversationParticipantSchema = new Schema<ConversationParticipantDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId:         { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    role:           { type: String, enum: ['owner', 'member'], default: 'member' },
    addedBy:        { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt:       { type: Date,   default: Date.now },
  },
  { timestamps: false },
);

// One record per (conversation, user). Also the pagination index:
// { conversationId, joinedAt } gives stable skip/limit paging.
ConversationParticipantSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true },
);
ConversationParticipantSchema.index({ conversationId: 1, joinedAt: 1 });
ConversationParticipantSchema.index({ userId: 1 });

// ─── ChatReadCursor ──────────────────────────────────────────────────────────
//
// One row per (conversation, reader). A reader is either a registered user
// (`userId` set) or a signed-URL guest (`externalUserName` set) — never both.
//
// `lastReadAt` is the only field the UI actually cares about; own-message
// delivery status is derived by comparing it to the message's `createdAt`.
// The optional `lastReadMessageId` is retained to power the "unread messages"
// divider anchor.

export interface ChatReadCursorDoc extends Document {
  userId?:           mongoose.Types.ObjectId; // unset for external guests
  externalUserName?: string;
  conversationId:    mongoose.Types.ObjectId;
  lastReadMessageId?: mongoose.Types.ObjectId;
  lastReadAt:        Date;
}

const ChatReadCursorSchema = new Schema<ChatReadCursorDoc>(
  {
    userId:            { type: Schema.Types.ObjectId, ref: 'User' },
    externalUserName:  { type: String, trim: true },
    conversationId:    { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    lastReadAt:        { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);

// Partial unique indexes — one cursor per (conversation, reader).
ChatReadCursorSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } },
);
ChatReadCursorSchema.index(
  { conversationId: 1, externalUserName: 1 },
  { unique: true, partialFilterExpression: { externalUserName: { $exists: true } } },
);

// ─── Model exports ───────────────────────────────────────────────────────────

export const Conversation  = mongoose.model<ConversationDoc>('Conversation', ConversationSchema);
export const ChatMessage   = mongoose.model<ChatMessageDoc>('ChatMessage', ChatMessageSchema);
export const ChatReadCursor = mongoose.model<ChatReadCursorDoc>('ChatReadCursor', ChatReadCursorSchema);
export const ConversationParticipant = mongoose.model<ConversationParticipantDoc>(
  'ConversationParticipant',
  ConversationParticipantSchema,
);
