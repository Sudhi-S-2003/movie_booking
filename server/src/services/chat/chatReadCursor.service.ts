// ─────────────────────────────────────────────────────────────────────────────
// chatReadCursor.service
//
// Thin wrapper around the shared read-cursor factory, bound to
// ChatMessage / ChatReadCursor and 'conversationId'.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { ChatMessage, ChatReadCursor } from '../../models/chat.model.js';
import { createReadCursorService } from '../shared/readCursor.service.js';
import type { AdvanceCursorArgs } from '../shared/readCursor.service.js';

const markReadInBatch = createReadCursorService(ChatMessage, ChatReadCursor, 'conversationId');

/**
 * Advance the read cursor for (user, conversation) to the latest non-self
 * message in the given batch.
 *
 * `conversationId` maps to the shared factory's `partitionId`.
 */
export const markChatMessagesRead = (args: {
  userId:         string;
  conversationId: string;
  messageIds:     string[];
}) =>
  markReadInBatch({
    userId:      args.userId,
    partitionId: args.conversationId,
    messageIds:  args.messageIds,
  } satisfies AdvanceCursorArgs);

/**
 * Advance the sender's own read cursor to the message they just sent.
 *
 * When a user sends a message they've obviously read everything up to it,
 * so we bump their cursor forward. Monotonic — only moves if the new
 * timestamp is strictly newer than the existing one.
 */
export const markSentMessageRead = (args: {
  userId:           string;
  conversationId:   string;
  messageId:        string;
  messageCreatedAt: Date;
}): Promise<unknown> => {
  const userObjId = new mongoose.Types.ObjectId(args.userId);
  const convObjId = new mongoose.Types.ObjectId(args.conversationId);

  return ChatReadCursor.findOneAndUpdate(
    {
      userId:         userObjId,
      conversationId: convObjId,
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
      $setOnInsert: { userId: userObjId, conversationId: convObjId },
    },
    { upsert: true },
  );
};

/**
 * High-Performance Group Read Consensus
 *
 * Checks if EVERY participant in a conversation has read past a certain
 * point by finding the "slowest" reader (minimum lastReadAt).
 *
 * Returns the minReadAt Date if consensus is met, or null if at least
 * one participant has never opened the chat (no cursor exists).
 */
export const getConversationReadConsensus = async (
  conversationId: string,
  totalParticipants: number,
): Promise<Date | null> => {
  const convObjId = new mongoose.Types.ObjectId(conversationId);

  const stats = await ChatReadCursor.aggregate([
    { $match: { conversationId: convObjId } },
    { $group: {
        _id: null,
        minReadAt: { $min: '$lastReadAt' },
        count: { $sum: 1 }
    }}
  ]);

  // Consensus is only possible if every single participant has a cursor.
  // (If count < totalParticipants, someone hasn't read anything yet).
  const hasReadAll = stats.length > 0 && stats[0].count >= totalParticipants;
  return hasReadAll ? stats[0].minReadAt : null;
};

/**
 * Filter a list of message IDs to only those that have been read by everyone.
 */
export const getFullyReadMessageIds = async (
  conversationId: string,
  messageIds: string[],
  minReadAt: Date,
): Promise<string[]> => {
  const messages = await ChatMessage.find(
    {
      _id: { $in: messageIds.map(id => new mongoose.Types.ObjectId(id)) },
      conversationId: new mongoose.Types.ObjectId(conversationId),
      createdAt: { $lte: minReadAt }
    },
    { _id: 1 }
  ).lean();

  return messages.map((m) => m._id.toString());
};
