// ─────────────────────────────────────────────────────────────────────────────
// longtextUpload model
//
// Short-lived handle for a longtext message upload in progress. Lets the
// client POST metadata (`text` = the head shown in the message bubble)
// ONCE at `start` time; every subsequent chunk upload + the final
// `complete` call just reference the opaque `uploadId`.
//
// The session can be owned by either:
//   • a JWT-authenticated user  (`userId` present)
//   • an external guest on a signed URL (`externalUserName` + `conversationId`)
// Exactly one of those identity shapes is required per row.
//
// Rows auto-delete 1 hour after creation via a TTL index so abandoned
// uploads don't pile up. The corresponding `MessageChunk` rows have their
// own TTL on `createdAt` filtered to `messageId: { $exists: false }` so
// they self-clean in the same window.
//
// NOTE: the total message length is NOT stored here. It's computed
// authoritatively at `complete` time from `text.length` + the actual
// `content.length` of every persisted chunk. Accepting a client-declared
// `fullLength` would let a malicious caller declare a small number at
// `start` and then upload massive chunks — a metering bypass. Compute
// from reality instead.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document } from 'mongoose';
import { LONGTEXT_PREVIEW_LIMIT } from './messageChunk.model.js';

export interface LongtextUploadDoc extends Document {
  uploadId:          string;
  /** Present for the JWT flow. */
  userId?:           mongoose.Types.ObjectId;
  /** Present for the signed-URL guest flow — matches the conversation's
   *  externalUser.name. */
  externalUserName?: string;
  /** Scopes a guest upload to the conversation whose signature opened it. */
  conversationId?:   mongoose.Types.ObjectId;
  /** Head of the message — up to `LONGTEXT_PREVIEW_LIMIT` chars. Stored on
   *  `ChatMessage.text` once the upload completes. */
  text:              string;
  createdAt:         Date;
}

const LongtextUploadSchema = new Schema<LongtextUploadDoc>(
  {
    uploadId:         { type: String, required: true, unique: true },
    userId:           { type: Schema.Types.ObjectId, ref: 'User' },
    externalUserName: { type: String },
    conversationId:   { type: Schema.Types.ObjectId, ref: 'Conversation' },
    text:             { type: String, required: true, maxlength: LONGTEXT_PREVIEW_LIMIT },
    createdAt:        { type: Date,   default: Date.now },
  },
  { versionKey: false },
);

// Enforce: exactly ONE of userId / externalUserName must be present. Both-or-
// neither is never a legal session — the controllers set exactly one.
LongtextUploadSchema.path('uploadId').validate(function (this: LongtextUploadDoc) {
  const hasUser  = Boolean(this.userId);
  const hasGuest = Boolean(this.externalUserName);
  if (hasUser === hasGuest) return false;
  if (hasGuest && !this.conversationId) return false;
  return true;
}, 'LongtextUpload requires exactly one of userId / externalUserName (and conversationId for guests)');

// TTL: 1 hour from creation. MongoDB's background sweeper will purge
// abandoned sessions shortly after.
LongtextUploadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

// Per-owner lookup on complete — participates in the (owner, uploadId) access
// check without having to pull every session into memory.
LongtextUploadSchema.index({ userId: 1, uploadId: 1 });
LongtextUploadSchema.index({ externalUserName: 1, uploadId: 1 });

export const LongtextUpload = mongoose.model<LongtextUploadDoc>(
  'LongtextUpload',
  LongtextUploadSchema,
);
