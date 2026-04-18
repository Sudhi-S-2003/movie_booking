// ─────────────────────────────────────────────────────────────────────────────
// chatReadCursor.service
//
// Cursor-only read-receipt model. One row per (conversation, reader).
// `lastReadAt` is authoritative; delivery status (sent vs read) for a sender's
// own messages is computed by comparing it to each message's `createdAt`.
//
// Public surface:
//   • markConversationRead  — upsert cursor with lastReadAt = now
//   • markSentMessageRead   — sender's own cursor advancement on send
//   • advanceCursorTo       — advance cursor to a specific time + message id
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { type HydratedDocument } from 'mongoose';
import { ChatReadCursor } from '../../models/chat.model.js';
import type { ChatReadCursorDoc } from '../../models/chat.model.js';

export interface ReadReceiptIdentity {
  userId?:           string;
  externalUserName?: string;
}

interface CursorFilter {
  conversationId: mongoose.Types.ObjectId;
  userId?:        mongoose.Types.ObjectId;
  externalUserName?: string;
}

const buildIdentityFilter = (
  convObjId: mongoose.Types.ObjectId,
  identity:  ReadReceiptIdentity,
): CursorFilter | null => {
  if (identity.userId) {
    return { conversationId: convObjId, userId: new mongoose.Types.ObjectId(identity.userId) };
  }
  if (identity.externalUserName) {
    return { conversationId: convObjId, externalUserName: identity.externalUserName };
  }
  return null;
};

/**
 * Upsert the reader's cursor for this conversation with `lastReadAt = now`.
 * Monotonic: never rewinds — if a newer timestamp is already stored we keep it.
 * Returns the live cursor (or null if neither identity was supplied).
 */
export const markConversationRead = async (
  conversationId: string,
  identity:       ReadReceiptIdentity,
): Promise<HydratedDocument<ChatReadCursorDoc> | null> => {
  const convObjId = new mongoose.Types.ObjectId(conversationId);
  const filter    = buildIdentityFilter(convObjId, identity);
  if (!filter) return null;

  const now = new Date();

  try {
    const cursor = await ChatReadCursor.findOneAndUpdate(
      { ...filter, $or: [{ lastReadAt: { $lt: now } }, { lastReadAt: { $exists: false } }] },
      {
        $set:         { lastReadAt: now },
        $setOnInsert: { ...filter },
      },
      { upsert: true, returnDocument: 'after' },
    );
    if (cursor) return cursor;
    // No-op update (cursor already >= now) — fetch the existing doc.
    return await ChatReadCursor.findOne(filter);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
      // Lost the upsert race; another writer created the row concurrently.
      return ChatReadCursor.findOne(filter);
    }
    throw err;
  }
};

/**
 * Advance the sender's own read cursor to the moment they just sent a message.
 * Cheap idempotent upsert — the sender has obviously read everything up to
 * and including their own send.
 */
export const markSentMessageRead = async (args: {
  userId?:          string;
  externalUserName?: string;
  conversationId:   string;
  messageCreatedAt: Date;
}): Promise<void> => {
  const convObjId = new mongoose.Types.ObjectId(args.conversationId);
  const filter = buildIdentityFilter(convObjId, {
    ...(args.userId           && { userId: args.userId }),
    ...(args.externalUserName && { externalUserName: args.externalUserName }),
  });
  if (!filter) return;

  try {
    await ChatReadCursor.updateOne(
      { ...filter, $or: [{ lastReadAt: { $lt: args.messageCreatedAt } }, { lastReadAt: { $exists: false } }] },
      {
        $set:         { lastReadAt: args.messageCreatedAt },
        $setOnInsert: { ...filter },
      },
      { upsert: true },
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) return;
    throw err;
  }
};

/**
 * Advance the reader's cursor to a specific `lastReadAt` + `lastReadMessageId`
 * pair. Monotonic — no-op if the stored cursor already equals or exceeds the
 * supplied timestamp. Used by the per-message read endpoint to keep the
 * fast-path unread-count cursor in sync with the max `createdAt` of the
 * messages that were just marked.
 */
export const advanceCursorTo = async (args: {
  conversationId:    string;
  userId?:           string;
  externalUserName?: string;
  lastReadAt:        Date;
  lastReadMessageId?: mongoose.Types.ObjectId;
}): Promise<void> => {
  const convObjId = new mongoose.Types.ObjectId(args.conversationId);
  const filter = buildIdentityFilter(convObjId, {
    ...(args.userId           && { userId: args.userId }),
    ...(args.externalUserName && { externalUserName: args.externalUserName }),
  });
  if (!filter) return;

  try {
    await ChatReadCursor.updateOne(
      { ...filter, $or: [{ lastReadAt: { $lt: args.lastReadAt } }, { lastReadAt: { $exists: false } }] },
      {
        $set: {
          lastReadAt: args.lastReadAt,
          ...(args.lastReadMessageId && { lastReadMessageId: args.lastReadMessageId }),
        },
        $setOnInsert: { ...filter },
      },
      { upsert: true },
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) return;
    throw err;
  }
};
