// ─────────────────────────────────────────────────────────────────────────────
// messageRead.service
//
// Per-message read records (complements `ChatReadCursor`).
//
// Public surface:
//   • recordReads              — bulk upsert read records for a set of messages
//   • getReadStatusForMessages — resolve 'sent' | 'read' per messageId for a
//                                given viewer (read ⇔ any OTHER identity has
//                                a MessageRead for that message).
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { MessageRead } from '../../models/messageRead.model.js';

interface ReaderIdentity {
  userId?:           string;
  externalUserName?: string;
}

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

  // Find which messageIds already have a record for this identity so we can
  // report back the set of NEWLY marked ones.
  const existing = await MessageRead.find(
    { messageId: { $in: clean }, ...identityFilter },
    { messageId: 1, _id: 0 },
  ).lean();
  const existingIds = new Set(existing.map((r) => r.messageId.toString()));

  const freshIds = clean.filter((id) => !existingIds.has(id.toString()));
  if (freshIds.length === 0) return { insertedIds: [] };

  const ops = freshIds.map((messageId) => ({
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

  try {
    await MessageRead.bulkWrite(ops, { ordered: false });
  } catch (err: unknown) {
    // Ignore duplicate-key races; other writers won and that's fine.
    const e = err as { code?: number; writeErrors?: Array<{ code?: number }> };
    const onlyDup = (e.code === 11000)
      || (Array.isArray(e.writeErrors) && e.writeErrors.every((w) => w.code === 11000));
    if (!onlyDup) throw err;
  }

  return { insertedIds: freshIds.map((id) => id.toString()) };
};

/**
 * For each messageId, resolve whether *any OTHER* reader has recorded a read.
 * Returns a map keyed by messageId string → 'sent' | 'read'.
 *
 * The viewer's own read records don't count — "read" means someone else
 * has seen the message.
 */
export const getReadStatusForMessages = async (
  messageIds: mongoose.Types.ObjectId[] | string[],
  viewer:     ReaderIdentity,
): Promise<Map<string, 'sent' | 'read'>> => {
  const result = new Map<string, 'sent' | 'read'>();
  if (messageIds.length === 0) return result;

  const ids = messageIds.map((id) =>
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id,
  );
  for (const id of ids) result.set(id.toString(), 'sent');

  const viewerExclusion: Record<string, unknown> = {};
  if (viewer.userId) {
    viewerExclusion.userId = { $ne: new mongoose.Types.ObjectId(viewer.userId) };
  } else if (viewer.externalUserName) {
    viewerExclusion.externalUserName = { $ne: viewer.externalUserName };
  }

  const rows = await MessageRead.find(
    { messageId: { $in: ids }, ...viewerExclusion },
    { messageId: 1, _id: 0 },
  ).lean();

  for (const row of rows) {
    result.set(row.messageId.toString(), 'read');
  }
  return result;
};
