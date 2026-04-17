// ─────────────────────────────────────────────────────────────────────────────
// issueReadCursor.service
//
// Thin wrapper around the shared read-cursor factory, bound to
// IssueMessage / IssueReadCursor and 'issueId'.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { IssueMessage, IssueReadCursor } from '../../models/issue.model.js';
import { createReadCursorService } from '../shared/readCursor.service.js';
import type { AdvanceCursorArgs } from '../shared/readCursor.service.js';

const markReadInBatch = createReadCursorService(IssueMessage, IssueReadCursor, 'issueId');

/**
 * Advance the read cursor for (user, issue) to the latest non-self message in
 * the given batch.
 *
 * `issueId` maps to the shared factory's `partitionId`.
 */
export const markIssueMessagesRead = (args: {
  userId:     string;
  issueId:    string;
  messageIds: string[];
}) =>
  markReadInBatch({
    userId:      args.userId,
    partitionId: args.issueId,
    messageIds:  args.messageIds,
  } satisfies AdvanceCursorArgs);

/**
 * Advance the sender's own read cursor to the message they just sent.
 *
 * When a user sends a reply they've obviously read everything up to it,
 * so we bump their cursor forward. Monotonic — only moves if the new
 * timestamp is strictly newer than the existing one.
 */
export const markSentReplyRead = (args: {
  userId:           string;
  issueId:          string;
  messageId:        string;
  messageCreatedAt: Date;
}): Promise<unknown> => {
  const userObjId  = new mongoose.Types.ObjectId(args.userId);
  const issueObjId = new mongoose.Types.ObjectId(args.issueId);

  return IssueReadCursor.findOneAndUpdate(
    {
      userId:  userObjId,
      issueId: issueObjId,
      $or: [
        { lastReadAt: { $lt: args.messageCreatedAt } },
        { lastReadAt: { $exists: false } },
      ],
    },
    {
      $set: {
        lastReadMessageId: new mongoose.Types.ObjectId(args.messageId),
        lastReadAt:        args.messageCreatedAt,
      },
      $setOnInsert: { userId: userObjId, issueId: issueObjId },
    },
    { upsert: true },
  );
};
