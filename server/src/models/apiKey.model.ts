// ─────────────────────────────────────────────────────────────────────────────
// apiKey.model
//
// Per-user API credentials. Each record stores:
//   • `keyId`       — public identifier (shown in headers, logs). Unique.
//   • `secretHash`  — bcrypt hash of the secret. The raw secret is NEVER
//                     persisted; it's returned exactly once on creation.
//   • `name`, `category` — freeform metadata so users can label keys by
//                     purpose ("Slack bot" / "automation" / "personal").
//   • `lastUsedAt`  — bumped on every successful verification; lets the UI
//                     show "last used 2h ago" without a separate audit log.
//   • `revokedAt`   — soft-revoke timestamp. Verification rejects revoked
//                     rows but the history is preserved.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document } from 'mongoose';

export type ApiKeyCategory = 'chat';

export interface ApiKeyDoc extends Document {
  userId:      mongoose.Types.ObjectId;
  name:        string;
  category:    ApiKeyCategory;
  keyId:       string;
  secretHash:  string;
  lastUsedAt?: Date;
  revokedAt?:  Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const ApiKeySchema = new Schema<ApiKeyDoc>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:       { type: String, required: true, trim: true, maxlength: 80 },
    category:   {
      type:     String,
      enum:     ['chat'],
      default:  'chat',
      required: true,
    },
    keyId:      { type: String, required: true, unique: true },
    secretHash: { type: String, required: true, select: false }, // never ship by default
    lastUsedAt: { type: Date },
    revokedAt:  { type: Date },
  },
  { timestamps: true },
);

// List a user's keys sorted by recency (active first is handled in the query).
ApiKeySchema.index({ userId: 1, createdAt: -1 });
// Fast lookup for verification — `keyId` is already unique globally.

export const ApiKey = mongoose.model<ApiKeyDoc>('ApiKey', ApiKeySchema);
