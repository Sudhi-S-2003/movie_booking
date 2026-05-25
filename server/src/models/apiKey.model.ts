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

import mongoose, { Schema } from 'mongoose';
import { ApiServiceCategory } from '../constants/enums.js';

export type ApiKeyCategory = ApiServiceCategory;

export interface IApiKey {
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

export type ApiKeyDoc = mongoose.HydratedDocument<IApiKey>;

const ApiKeySchema = new Schema<IApiKey>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:       { type: String, required: true, trim: true, maxlength: 80 },
    category:   {
      type:     String,
      enum:     Object.values(ApiServiceCategory),
      default:  ApiServiceCategory.CHAT,
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

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
