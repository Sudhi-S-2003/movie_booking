// ─────────────────────────────────────────────────────────────────────────────
// chatInvite.model
//
// Two collections power the chat onboarding flow:
//
//   1. ConversationInvite      — owner-issued invite links (tokens). Anyone
//                                who knows the token can join (subject to
//                                TTL / max-use / revoked checks).
//
//   2. ConversationJoinRequest — a visitor on a group's public page asks to
//                                join; the owner approves or rejects.
//
// Both are scoped to a single Conversation and carry the `createdBy` /
// `userId` of the actor so the workflow is auditable.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema } from 'mongoose';

// ─── ConversationInvite ──────────────────────────────────────────────────────

export interface IConversationInvite {
  conversationId: mongoose.Types.ObjectId;
  /** URL-safe random string. The indexed lookup key. */
  token:          string;
  createdBy:      mongoose.Types.ObjectId;
  /** Optional expiry — null means "never expires". */
  expiresAt:      Date | null;
  /** Optional usage cap — null means "unlimited". */
  maxUses:        number | null;
  usesCount:      number;
  /** Soft-revoke flag. Keeps the audit trail; blocks new consumption. */
  revoked:        boolean;
  createdAt:      Date;
  updatedAt:      Date;
}

export type ConversationInviteDoc = mongoose.HydratedDocument<IConversationInvite>;

const ConversationInviteSchema = new Schema<IConversationInvite>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    token:          { type: String, required: true, unique: true },
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    expiresAt:      { type: Date,   default: null },
    maxUses:        { type: Number, default: null, min: 1 },
    usesCount:      { type: Number, default: 0, min: 0 },
    revoked:        { type: Boolean, default: false },
  },
  { timestamps: true },
);

// List invites for a conversation sorted by recency.
ConversationInviteSchema.index({ conversationId: 1, createdAt: -1 });

// ─── ConversationJoinRequest ─────────────────────────────────────────────────

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IConversationJoinRequest {
  conversationId: mongoose.Types.ObjectId;
  userId:         mongoose.Types.ObjectId;
  status:         JoinRequestStatus;
  /** Optional note from the requester — shown to the owner on review. */
  message?:       string;
  resolvedAt?:    Date;
  resolvedBy?:    mongoose.Types.ObjectId;
  createdAt:      Date;
  updatedAt:      Date;
}

export type ConversationJoinRequestDoc = mongoose.HydratedDocument<IConversationJoinRequest>;

const ConversationJoinRequestSchema = new Schema<IConversationJoinRequest>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId:         { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    status:         {
      type:     String,
      enum:     ['pending', 'approved', 'rejected'],
      default:  'pending',
    },
    message:    { type: String, trim: true, maxlength: 500 },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Pagination & owner review list.
ConversationJoinRequestSchema.index({ conversationId: 1, status: 1, createdAt: -1 });
// One pending request per (user, conversation). Partial index so historical
// approved/rejected rows don't block re-requests later on.
ConversationJoinRequestSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);
// For "do I already have a request here?" checks on the user side.
ConversationJoinRequestSchema.index({ userId: 1, status: 1 });

// ─── Exports ─────────────────────────────────────────────────────────────────

export const ConversationInvite = mongoose.model<IConversationInvite>(
  'ConversationInvite',
  ConversationInviteSchema,
);

export const ConversationJoinRequest = mongoose.model<IConversationJoinRequest>(
  'ConversationJoinRequest',
  ConversationJoinRequestSchema,
);
