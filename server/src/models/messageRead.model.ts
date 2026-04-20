// ─────────────────────────────────────────────────────────────────────────────
// MessageRead
//
// Per-message read record. Complements the `ChatReadCursor` "high-water mark"
// by recording which specific messages a reader has actually looked at.
//
// Why both?
//   • ChatReadCursor  — fast path for unread-count queries (monotonic).
//   • MessageRead     — authoritative per-message tick state and accurate
//                       accounting when older messages are scrolled into
//                       view (the cursor may already be past them).
//
// One row per (messageId, reader). A reader is either a registered user
// (`userId` set) or a signed-URL guest (`externalUserName` set) — never both.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document } from 'mongoose';

interface MessageReadDoc extends Document {
  conversationId:   mongoose.Types.ObjectId;
  messageId:        mongoose.Types.ObjectId;
  userId?:          mongoose.Types.ObjectId;
  externalUserName?: string;
  readAt:           Date;
}

const MessageReadSchema = new Schema<MessageReadDoc>(
  {
    conversationId:   { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    messageId:        { type: Schema.Types.ObjectId, ref: 'ChatMessage',  required: true },
    userId:           { type: Schema.Types.ObjectId, ref: 'User' },
    externalUserName: { type: String, trim: true },
    readAt:           { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);

// Partial unique indexes — one record per (message, reader).
MessageReadSchema.index(
  { messageId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } },
);
MessageReadSchema.index(
  { messageId: 1, externalUserName: 1 },
  { unique: true, partialFilterExpression: { externalUserName: { $exists: true } } },
);

// Secondary index for aggregations (unread count corrections, etc.).
MessageReadSchema.index({ conversationId: 1, readAt: 1 });

export const MessageRead = mongoose.model<MessageReadDoc>('MessageRead', MessageReadSchema);
