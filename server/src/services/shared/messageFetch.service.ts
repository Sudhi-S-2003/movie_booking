// ─────────────────────────────────────────────────────────────────────────────
// shared/messageFetch.service
//
// Generic cursor-based pagination factory. Pass in a Mongoose model and the
// partition-key field name to get back all five fetch functions.
//
// Used by:
//   chat/chatMessageFetch.service    (ChatMessage, 'conversationId')
//   support/messageFetch.service     (IssueMessage, 'issueId')
// ─────────────────────────────────────────────────────────────────────────────

import type { Model } from 'mongoose';

export interface FetchPageResult {
  messages:    any[];
  hasBefore:    boolean;
  hasAfter:    boolean;
  beforeCursor: string | null;
  afterCursor: string | null;
  /** Index of the target message in the returned array (only set for `around`) */
  targetIndex?: number;
}

export const buildCursor = (m: any): string =>
  `${(m.createdAt as Date).toISOString()}_${String(m._id)}`;

export const parseCursor = (raw: string): { ts: Date; lastId: string | null } => {
  const sep = raw.lastIndexOf('_');
  if (sep === -1) return { ts: new Date(raw), lastId: null };
  return { ts: new Date(raw.slice(0, sep)), lastId: raw.slice(sep + 1) || null };
};

export interface MessageFetchService {
  loadLatest:     (partitionId: string, limit: number) => Promise<FetchPageResult>;
  loadOlder:      (partitionId: string, cursor: string, limit: number) => Promise<FetchPageResult>;
  loadNewer:      (partitionId: string, cursor: string, limit: number) => Promise<FetchPageResult>;
  loadAround:     (partitionId: string, targetMessageId: string, limit: number) => Promise<FetchPageResult | null>;
  loadWithAnchor: (partitionId: string, anchorMessageId: string, limit: number) => Promise<FetchPageResult>;
}

/**
 * Create a complete set of cursor-paginated fetch functions bound to a specific
 * Mongoose model and partition-key field (e.g. 'conversationId' or 'issueId').
 */
export function createMessageFetchService(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MessageModel: Model<any>,
  partitionKey: string,
): MessageFetchService {
  /** Newest `limit` messages, ascending order. */
  const loadLatest = async (
    partitionId: string,
    limit: number,
  ): Promise<FetchPageResult> => {
    const raw = await MessageModel.find({ [partitionKey]: partitionId } as any)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasBefore = raw.length > limit;
    const page = hasBefore ? raw.slice(0, limit) : raw;
    const messages = page.slice().reverse();

    return {
      messages,
      hasBefore,
      hasAfter:    false,
      beforeCursor: messages.length > 0 ? buildCursor(messages[0]) : null,
      afterCursor: messages.length > 0 ? buildCursor(messages[messages.length - 1]) : null,
    };
  };

  /** Paginate upwards from cursor (older messages). */
  const loadOlder = async (
    partitionId: string,
    cursor: string,
    limit: number,
  ): Promise<FetchPageResult> => {
    const { ts, lastId } = parseCursor(cursor);
    const filter: any = { [partitionKey]: partitionId };
    if (lastId) {
      filter.$or = [
        { createdAt: { $lt: ts } },
        { createdAt: ts, _id: { $lt: lastId } },
      ];
    } else {
      filter.createdAt = { $lt: ts };
    }

    const raw = await MessageModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasBefore = raw.length > limit;
    const page = hasBefore ? raw.slice(0, limit) : raw;
    const messages = page.slice().reverse();

    return {
      messages,
      hasBefore,
      hasAfter:    true,
      beforeCursor: messages.length > 0 ? buildCursor(messages[0]) : null,
      afterCursor: messages.length > 0 ? buildCursor(messages[messages.length - 1]) : null,
    };
  };

  /** Paginate downwards from cursor (newer messages — window refill). */
  const loadNewer = async (
    partitionId: string,
    cursor: string,
    limit: number,
  ): Promise<FetchPageResult> => {
    const { ts, lastId } = parseCursor(cursor);
    const filter: any = { [partitionKey]: partitionId };
    if (lastId) {
      filter.$or = [
        { createdAt: { $gt: ts } },
        { createdAt: ts, _id: { $gt: lastId } },
      ];
    } else {
      filter.createdAt = { $gt: ts };
    }

    const raw = await MessageModel.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasAfter = raw.length > limit;
    const page = hasAfter ? raw.slice(0, limit) : raw;

    return {
      messages:    page,
      hasBefore:    true,
      hasAfter,
      beforeCursor: page.length > 0 ? buildCursor(page[0]) : null,
      afterCursor: page.length > 0 ? buildCursor(page[page.length - 1]) : null,
    };
  };

  /** Window centered on a target message. */
  const loadAround = async (
    partitionId: string,
    targetMessageId: string,
    limit: number,
  ): Promise<FetchPageResult | null> => {
    const target = await MessageModel.findOne(
      { _id: targetMessageId, [partitionKey]: partitionId } as any,
    ).lean();
    if (!target) return null;

    const half = Math.floor(limit / 2);
    const targetTs = (target as any).createdAt as Date;
    const targetId = (target as any)._id as unknown;

    const [olderRaw, newerRaw] = await Promise.all([
      MessageModel.find({
        [partitionKey]: partitionId,
        $or: [
          { createdAt: { $lt: targetTs } },
          { createdAt: targetTs, _id: { $lt: targetId } },
        ],
      } as any)
        .sort({ createdAt: -1, _id: -1 })
        .limit(half + 1)
        .lean(),
      MessageModel.find({
        [partitionKey]: partitionId,
        $or: [
          { createdAt: { $gt: targetTs } },
          { createdAt: targetTs, _id: { $gt: targetId } },
        ],
      } as any)
        .sort({ createdAt: 1, _id: 1 })
        .limit(half + 1)
        .lean(),
    ]);

    const hasBefore = olderRaw.length > half;
    const hasAfter = newerRaw.length > half;
    const older = (hasBefore ? olderRaw.slice(0, half) : olderRaw).reverse();
    const newer = hasAfter ? newerRaw.slice(0, half) : newerRaw;

    const messages = [...older, target, ...newer];

    return {
      messages,
      hasBefore,
      hasAfter,
      beforeCursor: messages.length > 0 ? buildCursor(messages[0]) : null,
      afterCursor: messages.length > 0 ? buildCursor(messages[messages.length - 1]) : null,
      targetIndex: older.length,
    };
  };

  /** Open with "where I left off" anchor — cheap path first, then fallback. */
  const loadWithAnchor = async (
    partitionId: string,
    anchorMessageId: string,
    limit: number,
  ): Promise<FetchPageResult> => {
    const latest = await loadLatest(partitionId, limit);
    const anchorInWindow = latest.messages.some(
      (m: any) => String(m._id) === anchorMessageId,
    );
    if (anchorInWindow) return latest;

    const around = await loadAround(partitionId, anchorMessageId, limit);
    return around ?? latest;
  };

  return { loadLatest, loadOlder, loadNewer, loadAround, loadWithAnchor };
}
