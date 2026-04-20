// ─────────────────────────────────────────────────────────────────────────────
// chatReadCursor.service
//
// Cursor-only read-receipt model. One row per (conversation, reader).
// `lastReadAt` is authoritative; delivery status (sent vs read) for a sender's
// own messages is computed by comparing it to each message's `createdAt`.
//
// Public surface:
//   • markSentMessageRead   — sender's own cursor advancement on send
//   • advanceCursorTo       — advance cursor to a specific time + message id
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { ChatReadCursor } from '../../models/chat.model.js';
import { recordReads } from './messageRead.service.js';

interface ReadReceiptIdentity {
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
 * Advance the sender's own read cursor to the message they just sent and
 * record a MessageRead entry for it.
 *
 * Two state updates, both idempotent:
 *   1. `ChatReadCursor.lastReadAt` + `lastReadMessageId` bump (monotonic).
 *   2. `MessageRead` upsert for (messageId, viewer) — so per-message read
 *      aggregations treat the sender as having already read their own send.
 *
 * Everything is fire-and-forget safe: on duplicate-key race we no-op.
 */
export const markSentMessageRead = async (args: {
  userId?:          string;
  externalUserName?: string;
  conversationId:   string;
  messageId:        mongoose.Types.ObjectId | string;
  messageCreatedAt: Date;
}): Promise<void> => {
  const convObjId = new mongoose.Types.ObjectId(args.conversationId);
  const msgObjId  = typeof args.messageId === 'string'
    ? new mongoose.Types.ObjectId(args.messageId)
    : args.messageId;

  const filter = buildIdentityFilter(convObjId, {
    ...(args.userId           && { userId: args.userId }),
    ...(args.externalUserName && { externalUserName: args.externalUserName }),
  });
  if (!filter) return;

  // 1. Advance the coarse cursor with BOTH timestamp and messageId so the
  //    unread-divider anchor on next initial load points at the right spot.
  try {
    await ChatReadCursor.updateOne(
      { ...filter, $or: [{ lastReadAt: { $lt: args.messageCreatedAt } }, { lastReadAt: { $exists: false } }] },
      {
        $set: {
          lastReadAt:        args.messageCreatedAt,
          lastReadMessageId: msgObjId,
        },
        $setOnInsert: { ...filter },
      },
      { upsert: true },
    );
  } catch (err: unknown) {
    if (!(err && typeof err === 'object' && (err as { code?: number }).code === 11000)) {
      throw err;
    }
  }

  // 2. Record the per-message read event for the sender. Keeps the
  //    MessageRead collection consistent so delivery-status aggregation
  //    treats self-sent messages as already-read-by-self.
  await recordReads({
    conversationId: args.conversationId,
    messageIds:     [msgObjId.toString()],
    ...(args.userId           && { userId: args.userId }),
    ...(args.externalUserName && { externalUserName: args.externalUserName }),
  }).catch(() => { /* already recorded — fine */ });
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
