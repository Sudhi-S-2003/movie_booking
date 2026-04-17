// ─────────────────────────────────────────────────────────────────────────────
// shared/readCursor.service
//
// Generic read-cursor advance factory. Pass in the message model, the cursor
// model, and the partition-key field name to get back a `markMessagesRead`
// function with the correct monotonic-upsert behaviour.
//
// Used by:
//   chat/chatReadCursor.service      (ChatMessage, ChatReadCursor, 'conversationId')
//   support/issueReadCursor.service  (IssueMessage, IssueReadCursor, 'issueId')
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import type { Model } from 'mongoose';

export interface AdvanceCursorArgs {
  userId:      string;
  partitionId: string;
  messageIds:  string[];
}

export type AdvanceCursorFn = (args: AdvanceCursorArgs) => Promise<unknown>;

/**
 * Create a `markMessagesRead` function bound to specific Mongoose models and
 * a partition-key field name.
 *
 * Cursors are MONOTONIC — never rewound, even if stale receipts arrive out of
 * order. Self-reads are excluded so the sender's cursor doesn't leapfrog real
 * unread content.
 */
export function createReadCursorService(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MessageModel: Model<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CursorModel: Model<any>,
  partitionKey: string,
): AdvanceCursorFn {
  return async ({ userId, partitionId, messageIds }: AdvanceCursorArgs) => {
    if (!userId || !partitionId || messageIds.length === 0) return null;

    const userObjId      = new mongoose.Types.ObjectId(userId);
    const partitionObjId = new mongoose.Types.ObjectId(partitionId);

    // Find the chronologically latest message in the batch not sent by this user.
    const latest = await MessageModel.findOne(
      {
        _id:          { $in: messageIds.map((id) => new mongoose.Types.ObjectId(id)) },
        [partitionKey]: partitionObjId,
        senderId:     { $ne: userObjId },
      },
      { _id: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    if (!latest) return null;

    const latestDoc = latest as { _id: mongoose.Types.ObjectId; createdAt: Date };

    // Monotonic upsert: only overwrite if the new lastReadAt is strictly newer.
    return CursorModel.findOneAndUpdate(
      {
        userId:         userObjId,
        [partitionKey]: partitionObjId,
        $or: [
          { lastReadAt: { $lt: latestDoc.createdAt } },
          { lastReadAt: { $exists: false } },
        ],
      },
      {
        $set: {
          lastReadMessageId: latestDoc._id,
          lastReadAt:        latestDoc.createdAt,
        },
        $setOnInsert: { userId: userObjId, [partitionKey]: partitionObjId },
      },
      { upsert: true, new: true },
    ).catch((e: unknown) => {
      const err = e as { code?: number; message?: string };
      if (err?.code === 11000) {
        // Race condition with concurrent upsert — just read the existing doc.
        return CursorModel.findOne({ userId: userObjId, [partitionKey]: partitionObjId });
      }
      console.warn('[readCursor.advance] failed:', err?.message);
      return null;
    });
  };
}
