// ─────────────────────────────────────────────────────────────────────────────
// MessageChunk
//
// Backing store for the `longtext` chat message type. A single `ChatMessage`
// whose preview slice is persisted on `text` points at a linked list of
// MessageChunks (0-based `index`, `nextChunkId` pointer). Each chunk stores up
// to 10_000 characters. The client lazy-loads chunks on demand when the user
// expands a long message.
//
// Uploads are two-phase: callers first stream chunks tagged with an ephemeral
// `uploadId`, then issue a `complete` which stamps `messageId` onto every
// chunk and clears `uploadId`. Orphans (partially-uploaded chunks that never
// completed) are garbage-collected by the TTL index below.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document } from 'mongoose';

export const LONGTEXT_PREVIEW_LIMIT = 1000;
export const LONGTEXT_CHUNK_LIMIT   = 10_000;
/**
 * Maximum number of chunks permitted per longtext upload. Together with
 * `LONGTEXT_CHUNK_LIMIT` this caps a single message's body at
 * `LONGTEXT_MAX_CHUNKS * LONGTEXT_CHUNK_LIMIT` = 1,000,000 characters —
 * enough headroom for any legitimate long message while preventing a
 * malicious client from streaming unbounded chunk volume through a single
 * upload session.
 */
export const LONGTEXT_MAX_CHUNKS   = 100;

export interface MessageChunkDoc extends Document {
  /** Present once the chunk belongs to a completed message. */
  messageId?:   mongoose.Types.ObjectId;
  /** Ephemeral grouping during the upload phase. Cleared on complete. */
  uploadId?:    string;
  /** Order within the message, 0-based (0 is the chunk AFTER the preview). */
  index:        number;
  content:      string;
  /** Linked-list pointer — null/undefined on the last chunk. */
  nextChunkId?: mongoose.Types.ObjectId;
  createdAt:    Date;
}

const MessageChunkSchema = new Schema<MessageChunkDoc>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    uploadId:  { type: String, trim: true },
    index:     { type: Number, required: true, min: 0 },
    content: {
      type:     String,
      required: true,
      validate: {
        validator: (v: string) => typeof v === 'string' && v.length > 0 && v.length <= LONGTEXT_CHUNK_LIMIT,
        message:   `chunk content must be 1..${LONGTEXT_CHUNK_LIMIT} characters`,
      },
    },
    nextChunkId: { type: Schema.Types.ObjectId, ref: 'MessageChunk' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Ordered fetch once the chunk is bound to a message.
MessageChunkSchema.index({ messageId: 1, index: 1 });

// Idempotent upsert during the upload phase: `(uploadId, index)` pair uniquely
// identifies a chunk so re-sending the same index replaces its content.
MessageChunkSchema.index(
  { uploadId: 1, index: 1 },
  { unique: true, partialFilterExpression: { uploadId: { $type: 'string' } } },
);

// TTL: garbage-collect orphaned upload chunks after 1 hour. The partial
// filter keeps completed chunks (messageId set) around forever.
MessageChunkSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds:     60 * 60,
    partialFilterExpression: { messageId: { $exists: false } },
  },
);

export const MessageChunk = mongoose.model<MessageChunkDoc>('MessageChunk', MessageChunkSchema);
