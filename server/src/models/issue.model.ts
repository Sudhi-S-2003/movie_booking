// ─────────────────────────────────────────────────────────────────────────────
// Support / issue domain models
//
// Three collections power the support feature:
//
//   1. Issue            — the ticket itself (one per support thread)
//   2. IssueMessage     — chat messages within a ticket (1:N)
//   3. IssueReadCursor  — per-(user, issue) "last read" pointer; the SINGLE
//                         source of truth for read state. From it we derive
//                         unread counts, per-message tick state, and the
//                         Slack-style "jump to where you left off" anchor.
//
// Read state is intentionally pointer-based, not row-per-message, because
// reads are inherently monotonic — knowing the high-water mark is enough
// to answer every question we'd otherwise need a receipts table for.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document } from 'mongoose';

// ─── Issue ───────────────────────────────────────────────────────────────────

export interface IssueDoc extends Document {
  userId?: mongoose.Types.ObjectId;
  isGuest: boolean;
  guestInfo?: {
    name:  string;
    email: string;
  };
  role:        'User' | 'TheatreOwner' | 'Guest';
  category:    string;
  title:       string;
  description: string;
  status:      'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority:    'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: {
    linkedTheatreId?: mongoose.Types.ObjectId;
    linkedMovieId?:   mongoose.Types.ObjectId;
    url?:             string;
    browser?:         string;
    timestamp?:       Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema = new Schema<IssueDoc>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User' },
    isGuest: { type: Boolean, default: false },
    guestInfo: {
      name:  { type: String },
      email: { type: String },
    },
    role:        { type: String, enum: ['User', 'TheatreOwner', 'Guest'], required: true },
    category:    { type: String, required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    status:      { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
    priority:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    metadata: {
      linkedTheatreId: { type: Schema.Types.ObjectId, ref: 'Theatre' },
      linkedMovieId:   { type: Schema.Types.ObjectId, ref: 'Movie' },
      url:             { type: String },
      browser:         { type: String },
      timestamp:       { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

IssueSchema.index({ userId: 1, status: 1 });
IssueSchema.index({ updatedAt: -1 }); // admin listing sort

// ─── IssueMessage ────────────────────────────────────────────────────────────

export interface IssueMessageDoc extends Document {
  issueId:    mongoose.Types.ObjectId;
  senderId?:  mongoose.Types.ObjectId;
  senderName: string;
  senderRole: 'User' | 'TheatreOwner' | 'Admin' | 'Guest';
  text:       string;
  attachments: string[];
  replyTo?: {
    messageId:  mongoose.Types.ObjectId;
    senderName: string;
    text:       string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const IssueMessageSchema = new Schema<IssueMessageDoc>(
  {
    issueId:     { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    senderId:    { type: Schema.Types.ObjectId, ref: 'User' },
    senderName:  { type: String, required: true },
    senderRole:  { type: String, enum: ['User', 'TheatreOwner', 'Admin', 'Guest'], required: true },
    text:        { type: String, required: true },
    attachments: [{ type: String }],
    replyTo: {
      messageId:  { type: Schema.Types.ObjectId, ref: 'IssueMessage' },
      senderName: { type: String },
      text:       { type: String },
    },
  },
  { timestamps: true },
);

/**
 * Compound index for composite-cursor pagination.
 *
 * The cursor encodes both `createdAt` and `_id` so messages with identical
 * timestamps still order deterministically. Query shape:
 *
 *   WHERE issueId = :id
 *     AND ( createdAt < :ts OR (createdAt = :ts AND _id < :lastId) )
 *   ORDER BY createdAt DESC, _id DESC
 */
IssueMessageSchema.index({ issueId: 1, createdAt: -1, _id: -1 });
// Ascending index for loadNewer queries
IssueMessageSchema.index({ issueId: 1, createdAt: 1, _id: 1 });

// ─── IssueReadCursor ─────────────────────────────────────────────────────────

export interface IssueReadCursorDoc extends Document {
  userId:            mongoose.Types.ObjectId;
  issueId:           mongoose.Types.ObjectId;
  lastReadMessageId: mongoose.Types.ObjectId;
  lastReadAt:        Date;
}

const IssueReadCursorSchema = new Schema<IssueReadCursorDoc>(
  {
    userId:            { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    issueId:           { type: Schema.Types.ObjectId, ref: 'Issue',        required: true },
    lastReadMessageId: { type: Schema.Types.ObjectId, ref: 'IssueMessage', required: true },
    lastReadAt:        { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// One cursor per (user, issue) — upserts are idempotent
IssueReadCursorSchema.index({ userId: 1, issueId: 1 }, { unique: true });

// ─── Model exports ───────────────────────────────────────────────────────────

export const Issue           = mongoose.model<IssueDoc>('Issue', IssueSchema);
export const IssueMessage    = mongoose.model<IssueMessageDoc>('IssueMessage', IssueMessageSchema);
export const IssueReadCursor = mongoose.model<IssueReadCursorDoc>('IssueReadCursor', IssueReadCursorSchema);
