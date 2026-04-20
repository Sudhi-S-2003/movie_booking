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
  name?:        string;
  phone:        string;
  countryCode:  string;
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

export interface ChatMessageDoc extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId?:      mongoose.Types.ObjectId;  // null for system messages
  senderName:     string;
  contentType:    ChatContentType;
  text:           string;
  attachments:    string[];
  emoji?:         string;
  contact?:       ChatContactPayload;
  location?:      ChatLocationPayload;
  date?:          ChatDatePayload;
  event?:         ChatEventPayload;
  /** longtext: pointer to the first chunk (index 0). */
  startChunkId?:  mongoose.Types.ObjectId;
  /** longtext: pointer to the last chunk (so the client knows when to stop). */
  endChunkId?:    mongoose.Types.ObjectId;
  /** longtext: total length of preview + all chunks (chars). */
  fullLength?:    number;
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
    contentType: {
      type:    String,
      enum:    ['text', 'emoji', 'contact', 'location', 'image', 'file', 'system', 'date', 'event', 'longtext'],
      default: 'text',
    },
    // `text` stays required so any code path that reads `.text` for preview
    // gets a sensible fallback. For non-text types we synthesize one server-side.
    text:           { type: String, required: true },
    attachments:    [{ type: String }],

    emoji: {
      type: String,
      validate: {
        validator(this: ChatMessageDoc, v: string | undefined) {
          if (this.contentType !== 'emoji') return v === undefined || v === null || v === '';
          if (typeof v !== 'string' || v.length === 0) return false;
          // Count USER-PERCEIVED characters (graphemes), not UTF-16 code units.
          // A family emoji like 👨‍👩‍👧‍👦 is 1 grapheme but 11 code units (4
          // emoji × 2 surrogate pairs + 3 ZWJ joiners), so a plain `.length`
          // check would wrongly reject it.
          try {
            const Seg = (Intl as unknown as {
              Segmenter?: new (locale?: string, opts?: { granularity: string }) => {
                segment: (s: string) => Iterable<{ segment: string }>;
              };
            }).Segmenter;
            if (!Seg) return v.length <= 64; // fallback: byte-length sanity cap
            const seg = new Seg('en', { granularity: 'grapheme' });
            let graphemes = 0;
            for (const _ of seg.segment(v)) {
              graphemes += 1;
              if (graphemes > 8) return false;
            }
            return graphemes >= 1 && graphemes <= 8;
          } catch {
            return v.length <= 64;
          }
        },
        message: 'emoji must be 1–8 graphemes when contentType is emoji',
      },
    },

    contact: {
      _id:         false,
      name:        { type: String, trim: true },
      phone:       { type: String, trim: true },
      countryCode: { type: String, trim: true },
    },

    location: {
      _id:   false,
      lat:   { type: Number },
      lng:   { type: Number },
      label: { type: String, trim: true },
    },

    date: {
      _id:   false,
      iso:   { type: String, trim: true },
      label: { type: String, trim: true },
    },

    event: {
      _id:         false,
      title:       { type: String, trim: true },
      startsAt:    { type: String, trim: true },
      endsAt:      { type: String, trim: true },
      location:    { type: String, trim: true },
      description: { type: String, trim: true },
    },

    startChunkId: { type: Schema.Types.ObjectId, ref: 'MessageChunk' },
    endChunkId:   { type: Schema.Types.ObjectId, ref: 'MessageChunk' },
    fullLength:   { type: Number, min: 0 },

    replyTo: {
      messageId:  { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
      senderName: { type: String },
      text:       { type: String },
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Conditional document-level validation ──────────────────────────────────
// Centralizes the cross-field rules so the schema enforces the taxonomy and
// the controllers can rely on it (defense-in-depth — they also validate
// upfront to produce the precise `reason` codes documented in the API).
//
// Mongoose auto-materializes nested schema paths as empty objects (so a doc
// with no contact still has `doc.contact = {}`). We therefore check for
// MEANINGFUL content on the subdoc, not mere truthiness, and strip empty
// subdocs before save so they don't linger in the database.
//
// Mongoose 9 removed the `next` callback from `pre('validate')` — hooks now
// signal failure by throwing and success by returning normally.
const hasContactPayload = (c: ChatMessageDoc['contact']): boolean =>
  !!c && !!(c.phone || c.countryCode || c.name);

const hasLocationPayload = (l: ChatMessageDoc['location']): boolean =>
  !!l && (typeof l.lat === 'number' || typeof l.lng === 'number' || !!l.label);

const hasDatePayload = (d: ChatMessageDoc['date']): boolean =>
  !!d && (!!d.iso || !!d.label);

const hasEventPayload = (e: ChatMessageDoc['event']): boolean =>
  !!e && (!!e.title || !!e.startsAt || !!e.endsAt || !!e.location || !!e.description);

ChatMessageSchema.pre('validate', function chatContentTypeValidator(this: ChatMessageDoc) {
  const doc = this;

  if (doc.contentType === 'contact') {
    const c = doc.contact;
    if (!c || typeof c.phone !== 'string' || c.phone.length < 3 || c.phone.length > 20) {
      throw new Error('contact.phone must be a 3-20 char string');
    }
    if (typeof c.countryCode !== 'string' || !/^\+\d{1,4}$/.test(c.countryCode)) {
      throw new Error('contact.countryCode must match +<1-4 digits>');
    }
  } else if (hasContactPayload(doc.contact)) {
    throw new Error('contact payload not allowed for this contentType');
  } else if (doc.contact) {
    // Empty subdoc — drop it so we don't persist noise.
    doc.set('contact', undefined);
  }

  if (doc.contentType === 'location') {
    const l = doc.location;
    if (!l || typeof l.lat !== 'number' || l.lat < -90 || l.lat > 90) {
      throw new Error('location.lat must be a number in [-90, 90]');
    }
    if (typeof l.lng !== 'number' || l.lng < -180 || l.lng > 180) {
      throw new Error('location.lng must be a number in [-180, 180]');
    }
  } else if (hasLocationPayload(doc.location)) {
    throw new Error('location payload not allowed for this contentType');
  } else if (doc.location) {
    doc.set('location', undefined);
  }

  if (doc.contentType === 'date') {
    const d = doc.date;
    if (!d || typeof d.iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.iso)) {
      throw new Error('date.iso must match YYYY-MM-DD');
    }
  } else if (hasDatePayload(doc.date)) {
    throw new Error('date payload not allowed for this contentType');
  } else if (doc.date) {
    doc.set('date', undefined);
  }

  if (doc.contentType === 'longtext') {
    if (typeof doc.text !== 'string' || doc.text.length < 1 || doc.text.length > 1000) {
      throw new Error('longtext preview (text) must be 1..1000 chars');
    }
    if (typeof doc.fullLength !== 'number' || doc.fullLength <= 1000) {
      throw new Error('longtext fullLength must be > 1000');
    }
    // startChunkId / endChunkId are stamped AFTER initial save (two-phase
    // complete), so we don't require them here — their presence is validated
    // application-side once the chunks are linked.
  } else {
    if (doc.startChunkId || doc.endChunkId || typeof doc.fullLength === 'number') {
      // Drop silently — same pattern as contact/location subdocs above.
      doc.set('startChunkId', undefined);
      doc.set('endChunkId',   undefined);
      doc.set('fullLength',   undefined);
    }
  }

  if (doc.contentType === 'event') {
    const e = doc.event;
    if (!e || typeof e.title !== 'string' || !e.title.trim()) {
      throw new Error('event.title is required');
    }
    if (typeof e.startsAt !== 'string' || Number.isNaN(Date.parse(e.startsAt))) {
      throw new Error('event.startsAt must be an ISO datetime');
    }
  } else if (hasEventPayload(doc.event)) {
    throw new Error('event payload not allowed for this contentType');
  } else if (doc.event) {
    doc.set('event', undefined);
  }

});

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

interface ConversationParticipantDoc extends Document {
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
