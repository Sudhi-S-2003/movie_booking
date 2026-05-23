// ─────────────────────────────────────────────────────────────────────────────
// messageRead.service
//
// Per-message read records (complements `ChatReadCursor`).
//
// Public surface:
//   • recordReads              — bulk upsert read records for a set of messages
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { MessageRead } from '../../models/messageRead.model.js';
import { ChatMessage, Conversation, ConversationParticipant } from '../../models/chat.model.js';



const MAX_BATCH = 200;

/**
 * Upsert MessageRead records for a batch of messageIds. Idempotent — existing
 * rows are left alone; E11000 race winners keep their `readAt`. Returns the
 * number of NEW rows inserted (useful for "what was actually freshly marked").
 */
export const recordReads = async (args: {
  conversationId: string;
  messageIds:     string[];
  userId?:        string;
  externalUserName?: string;
}): Promise<{ insertedIds: string[] }> => {
  const { conversationId, userId, externalUserName } = args;
  if (!userId && !externalUserName) return { insertedIds: [] };

  // Validate and clamp.
  const clean: mongoose.Types.ObjectId[] = [];
  for (const raw of args.messageIds) {
    if (typeof raw !== 'string') continue;
    if (!mongoose.isValidObjectId(raw)) continue;
    clean.push(new mongoose.Types.ObjectId(raw));
    if (clean.length >= MAX_BATCH) break;
  }
  if (clean.length === 0) return { insertedIds: [] };

  const convObjId = new mongoose.Types.ObjectId(conversationId);
  const now = new Date();

  const identityFilter: Record<string, unknown> = userId
    ? { userId: new mongoose.Types.ObjectId(userId) }
    : { externalUserName };

  const ops = clean.map((messageId) => ({
    updateOne: {
      filter: { messageId, ...identityFilter },
      update: {
        $setOnInsert: {
          conversationId: convObjId,
          messageId,
          ...identityFilter,
          readAt: now,
        },
      },
      upsert: true,
    },
  }));

  let upsertedIds: Record<number, any> = {};
  try {
    const result = await MessageRead.bulkWrite(ops as any, { ordered: false });
    upsertedIds = result.upsertedIds || {};
  } catch (err: unknown) {
    // Ignore duplicate-key races; other writers won and that's fine.
    const e = err as {
      code?: number;
      writeErrors?: Array<{ code?: number }>;
      result?: { upsertedIds?: Record<number, any> };
    };
    const onlyDup = (e.code === 11000)
      || (Array.isArray(e.writeErrors) && e.writeErrors.every((w) => w.code === 11000));
    if (!onlyDup) throw err;

    if (e.result && e.result.upsertedIds) {
      upsertedIds = e.result.upsertedIds;
    }
  }

  const upsertedIndices = Object.keys(upsertedIds).map(Number);
  const freshIds = upsertedIndices.map((idx) => clean[idx]).filter((id): id is mongoose.Types.ObjectId => !!id);
  if (freshIds.length === 0) return { insertedIds: [] };

  // Update ChatMessage deliveryStatus to 'read' if appropriate.
  try {
    if (freshIds.length > 0) {
      const freshObjectIds = freshIds.map((id) => new mongoose.Types.ObjectId(id));
      if (userId) {
        // Find the conversation to check directParentParticipant.
        const conversation = await Conversation.findById(conversationId).lean();
        const isDirectParticipant = conversation?.directParentParticipant?.some(
          (p: any) => p.userId.toString() === userId
        ) ?? false;

        // Check if this participant has a parentId (team/agent membership).
        const participant = await ConversationParticipant.findOne({
          conversationId: convObjId,
          userId: new mongoose.Types.ObjectId(userId),
        }).lean();
        const hasParentId = !!participant?.parentId;

        if (isDirectParticipant || hasParentId) {
          await ChatMessage.updateMany(
            {
              _id: { $in: freshObjectIds },
              senderId: { $ne: new mongoose.Types.ObjectId(userId) },
            },
            { $set: { deliveryStatus: 'read' } }
          );
        }
      } else if (externalUserName) {
        // If reader is a guest, set deliveryStatus to 'read' for any messages sent by registered users (senderId is not null).
        await ChatMessage.updateMany(
          {
            _id: { $in: freshObjectIds },
            senderId: { $ne: null },
          },
          { $set: { deliveryStatus: 'read' } }
        );
      }
    }
  } catch (err: unknown) {
    // Don't fail the read recording if status update fails.
    console.error('Failed to update chat message delivery status:', err);
  }

  return { insertedIds: freshIds.map((id) => id.toString()) };
};


