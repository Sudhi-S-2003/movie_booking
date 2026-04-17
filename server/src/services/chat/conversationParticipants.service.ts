// ─────────────────────────────────────────────────────────────────────────────
// conversationParticipants.service
//
// Single source of truth for chat membership.
//
// Membership lives in the `ConversationParticipant` collection — one document
// per (conversationId, userId), with role/addedBy/joinedAt metadata. Every
// membership mutation goes through this service, which also refreshes the
// denormalized `Conversation.participantCount` field so hot read paths
// (read-consensus, receipts) can avoid a second round-trip.
//
// Public surface:
//
//   Writes:
//     syncParticipants(convId, userIds, opts)  — upsert membership rows
//     removeParticipantRow(convId, userId)     — delete one membership row
//
//   Reads:
//     isParticipant(convId, userId)            — gate for authorization
//     getParticipantIds(convId)                — fan-out targets for sockets
//     countParticipants(convId)                — authoritative count
//     listMembers({ ... })                     — paginated roster w/ user info
//     populateMembers(conversation)            — attach `.participants` array
//                                                to ONE conversation (detail)
//     populateDirectPeersBulk(conversations)   — attach `.participants` ONLY to
//                                                direct chats in a list, so
//                                                large groups don't bloat the
//                                                sidebar payload
//
// Direct / system conversation dedup is now performed by looking up the
// ConversationParticipant collection — no auxiliary `directKey` field.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { Conversation, ConversationParticipant } from '../../models/chat.model.js';
import { buildPageEnvelope } from '../../utils/pagination.js';
import type { PageParams, PageEnvelope } from '../../utils/pagination.js';

type IdLike = mongoose.Types.ObjectId | string;

const toObjectId = (v: IdLike) => new mongoose.Types.ObjectId(String(v));

/**
 * Recompute `Conversation.participantCount` from the authoritative
 * `ConversationParticipant` collection. Called after every membership
 * mutation so callers can trust the denormalized field.
 */
const refreshParticipantCount = async (conversationId: mongoose.Types.ObjectId): Promise<number> => {
  const count = await ConversationParticipant.countDocuments({ conversationId });
  await Conversation.updateOne({ _id: conversationId }, { $set: { participantCount: count } });
  return count;
};

// ── Writes ──────────────────────────────────────────────────────────────────

export interface SyncParticipantsOpts {
  /** Creator of the conversation — gets `role: 'owner'` on insert. */
  creatorId?: IdLike;
  /** User who added these members — stored on new rows only. */
  addedBy?:   IdLike;
}

/**
 * Idempotently insert a participant row for every (conversationId, userId).
 *
 * Existing rows are untouched — we never demote an owner back to a member or
 * overwrite `addedBy` / `joinedAt` on re-add. Safe to call after every
 * `$addToSet` on the embedded array.
 */
export const syncParticipants = async (
  conversationId: IdLike,
  userIds:       ReadonlyArray<IdLike>,
  opts: SyncParticipantsOpts = {},
): Promise<void> => {
  if (userIds.length === 0) return;

  const convId     = toObjectId(conversationId);
  const creatorStr = opts.creatorId ? String(opts.creatorId) : null;
  const addedById  = opts.addedBy   ? toObjectId(opts.addedBy) : null;
  const now        = new Date();

  const ops = userIds.map((uid) => {
    const uidObj  = toObjectId(uid);
    const isOwner = creatorStr !== null && String(uid) === creatorStr;
    const role: 'owner' | 'member' = isOwner ? 'owner' : 'member';

    return {
      updateOne: {
        filter: { conversationId: convId, userId: uidObj },
        update: {
          $setOnInsert: {
            conversationId: convId,
            userId:         uidObj,
            role,
            ...(addedById && { addedBy: addedById }),
            joinedAt:       now,
          },
        },
        upsert: true,
      },
    };
  });

  // `as any` is needed because the bulkWrite types don't widen literal role.
  await ConversationParticipant.bulkWrite(ops as any, { ordered: false });
  await refreshParticipantCount(convId);
};

/** Delete the membership row for a single user leaving a conversation. */
export const removeParticipantRow = async (
  conversationId: IdLike,
  userId:         IdLike,
): Promise<void> => {
  const convId = toObjectId(conversationId);
  const result = await ConversationParticipant.deleteOne({
    conversationId: convId,
    userId:         toObjectId(userId),
  });
  if (result.deletedCount > 0) {
    await refreshParticipantCount(convId);
  }
};

/**
 * Authoritative participant count — read directly from the
 * ConversationParticipant collection. Callers on hot paths should prefer
 * the denormalized `Conversation.participantCount`.
 */
export const countParticipants = (conversationId: IdLike): Promise<number> =>
  ConversationParticipant.countDocuments({ conversationId: toObjectId(conversationId) });

/** Membership gate. Returns `true` if the user has a row for this conversation. */
export const isParticipant = async (conversationId: IdLike, userId: IdLike): Promise<boolean> => {
  const exists = await ConversationParticipant.exists({
    conversationId: toObjectId(conversationId),
    userId:         toObjectId(userId),
  });
  return exists !== null;
};

/**
 * Stream participant userIds for fan-out (socket broadcasts) without
 * buffering the full roster in memory. Uses a server-side cursor so a
 * 10k-member group costs ~one batch of ObjectIds at a time.
 *
 * The callback is awaited per id — keep it light.
 */
export const forEachParticipant = async (
  conversationId: IdLike,
  callback: (userId: mongoose.Types.ObjectId) => void | Promise<void>,
): Promise<void> => {
  const cursor = ConversationParticipant.find(
    { conversationId: toObjectId(conversationId) },
    { userId: 1, _id: 0 },
  ).lean().cursor({ batchSize: 200 });

  for await (const row of cursor) {
    await callback(row.userId as mongoose.Types.ObjectId);
  }
};

/**
 * Materialize all participant userIds at once. Prefer `forEachParticipant`
 * for broadcasts; only use this when the caller genuinely needs an array
 * (e.g. small-group helpers, tests).
 */
export const getParticipantIds = async (conversationId: IdLike): Promise<mongoose.Types.ObjectId[]> => {
  const rows = await ConversationParticipant.find(
    { conversationId: toObjectId(conversationId) },
    { userId: 1, _id: 0 },
  ).lean();
  return rows.map((r) => r.userId as mongoose.Types.ObjectId);
};

/**
 * Member preview cap for the `participants` field on conversation payloads.
 *
 * Large groups could easily hold thousands of members; emitting the whole
 * roster on every `new_conversation` / list fetch is a memory + bandwidth
 * problem on the server AND the client. Clients paginate via
 * `GET /chat/conversations/:id/members` when they need the full list.
 */
export const PARTICIPANT_PREVIEW_LIMIT = 50;

export interface PopulatedParticipant {
  _id:      mongoose.Types.ObjectId;
  name:     string;
  username: string;
  avatar?:  string;
}

export interface PopulateOptions {
  /** Max participants to hydrate (default: PARTICIPANT_PREVIEW_LIMIT). */
  limit?: number;
}

/**
 * Attach `.participants` to a single lean conversation so the response shape
 * is compatible with clients that read `conversation.participants`. Used on
 * detail endpoints (getConversation / addParticipants / etc.) where the
 * caller is already operating on one doc.
 *
 * For the list endpoint use `populateDirectPeersBulk` — it avoids paying
 * for large-group rosters that the sidebar UI never displays.
 *
 * Capped at `limit` users to keep payloads bounded on large groups.
 */
export const populateMembers = async <T extends { _id: unknown }>(
  conversation: T,
  opts: PopulateOptions = {},
): Promise<T & { participants: PopulatedParticipant[] }> => {
  const limit = opts.limit ?? PARTICIPANT_PREVIEW_LIMIT;

  const rows = await ConversationParticipant.find(
    { conversationId: conversation._id as mongoose.Types.ObjectId | string },
    { userId: 1, role: 1, joinedAt: 1, _id: 0 },
  )
    // owner first, then join order — matches the paginated members endpoint.
    .sort({ role: 1, joinedAt: 1 })
    .limit(limit)
    .lean();

  const userIds = rows.map((r) => r.userId as mongoose.Types.ObjectId);

  const UserModel = mongoose.model('User');
  const users = userIds.length
    ? await UserModel.find(
        { _id: { $in: userIds } },
        { name: 1, username: 1, avatar: 1 },
      ).lean<PopulatedParticipant[]>()
    : [];

  // Preserve the cursor order rather than whatever the $in returns.
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const ordered = userIds
    .map((uid) => userById.get(String(uid)))
    .filter((u): u is PopulatedParticipant => Boolean(u));

  return { ...conversation, participants: ordered };
};

export interface DirectPeer {
  _id:      mongoose.Types.ObjectId;
  name:     string;
  username: string;
  avatar?:  string;
}

/**
 * Enrich direct (1:1) conversation rows with:
 *   • `title`     ← opposite participant's name (if not already set)
 *   • `avatarUrl` ← opposite participant's avatar (if not already set)
 *   • `peer`      ← `{ _id, name, username, avatar }` — lightweight handle
 *                   consumers can use for `@username` / profile links without
 *                   shipping a full participants array.
 *
 * Group and system rows pass through unchanged.
 *
 * Cost: two queries per page regardless of size:
 *   1. membership rows for the direct conversations on this page
 *   2. user lookup for the union of peer ids
 */
export const attachDirectPeer = async <T extends { _id: unknown; type: string; title?: string; avatarUrl?: string }>(
  rows: T[],
  viewerId: IdLike,
): Promise<Array<T & { peer?: DirectPeer }>> => {
  const directRows = rows.filter((r) => r.type === 'direct');
  if (directRows.length === 0) return rows;

  const viewerStr = String(viewerId);
  const directConvIds = directRows.map((r) => r._id as mongoose.Types.ObjectId | string);

  const memberships = await ConversationParticipant.find(
    { conversationId: { $in: directConvIds } },
    { conversationId: 1, userId: 1, _id: 0 },
  ).lean();

  // For each direct conversation, find the id of the user who isn't the viewer.
  const peerIdByConv = new Map<string, string>();
  for (const m of memberships) {
    if (String(m.userId) === viewerStr) continue;
    peerIdByConv.set(String(m.conversationId), String(m.userId));
  }

  const peerIds = Array.from(new Set(peerIdByConv.values()))
    .map((id) => new mongoose.Types.ObjectId(id));

  const UserModel = mongoose.model('User');
  const peers = peerIds.length
    ? await UserModel.find(
        { _id: { $in: peerIds } },
        { name: 1, username: 1, avatar: 1 },
      ).lean<DirectPeer[]>()
    : [];
  const peerById = new Map(peers.map((p) => [String(p._id), p]));

  return rows.map((r) => {
    if (r.type !== 'direct') return r;
    const peerId = peerIdByConv.get(String(r._id));
    const peer   = peerId ? peerById.get(peerId) : null;
    if (!peer) return r;
    return {
      ...r,
      // Derived fields — never persisted, only shaped for the wire.
      title:     r.title     ?? peer.name,
      avatarUrl: r.avatarUrl ?? peer.avatar,
      peer,
    };
  });
};

/**
 * Populate `.participants` for the conversation-list endpoint — but ONLY for
 * direct (1:1) conversations, which the UI needs to resolve the "other
 * person" for avatar/name rendering. Group and system rows get an empty
 * `participants: []`, because the list UI reads their title/avatarUrl
 * instead — and hydrating thousands of group members just for a sidebar
 * row would be an obvious scalability trap.
 *
 * Cost: exactly two queries regardless of page size:
 *   1. membership rows for the direct conversations on this page
 *   2. user lookup for the union of those participant ids
 */
export const populateDirectPeersBulk = async <T extends { _id: unknown; type: string }>(
  conversations: T[],
): Promise<Array<T & { participants: PopulatedParticipant[] }>> => {
  if (conversations.length === 0) return [];

  const directIds = conversations
    .filter((c) => c.type === 'direct')
    .map((c) => c._id as mongoose.Types.ObjectId | string);

  if (directIds.length === 0) {
    return conversations.map((c) => ({ ...c, participants: [] }));
  }

  const rows = await ConversationParticipant.find(
    { conversationId: { $in: directIds } },
    { conversationId: 1, userId: 1, _id: 0 },
  ).lean();

  const userIds = Array.from(new Set(rows.map((r) => String(r.userId))))
    .map((id) => new mongoose.Types.ObjectId(id));

  const UserModel = mongoose.model('User');
  const users = userIds.length
    ? await UserModel.find(
        { _id: { $in: userIds } },
        { name: 1, username: 1, avatar: 1 },
      ).lean<PopulatedParticipant[]>()
    : [];

  const userById = new Map(users.map((u) => [String(u._id), u]));
  const byConvId = new Map<string, PopulatedParticipant[]>();
  for (const r of rows) {
    const key = String(r.conversationId);
    const user = userById.get(String(r.userId));
    if (!user) continue;
    const arr = byConvId.get(key) ?? [];
    arr.push(user);
    byConvId.set(key, arr);
  }

  return conversations.map((c) => ({
    ...c,
    participants: c.type === 'direct' ? (byConvId.get(String(c._id)) ?? []) : [],
  }));
};


/**
 * Return the set of conversationIds that the given user is a member of.
 * Used by the conversation list and unread-count aggregations.
 */
export const getUserConversationIds = async (userId: IdLike): Promise<mongoose.Types.ObjectId[]> => {
  const rows = await ConversationParticipant.find(
    { userId: toObjectId(userId) },
    { conversationId: 1, _id: 0 },
  ).lean();
  return rows.map((r) => r.conversationId as mongoose.Types.ObjectId);
};

// ── Reads ───────────────────────────────────────────────────────────────────

export interface ListedMember {
  _id:       string;
  name:      string;
  username:  string;
  avatar:    string | undefined;
  bio:       string | undefined;
  role:      'owner' | 'member';
  joinedAt:  Date;
  isCreator: boolean;
  isYou:     boolean;
}

export interface ListMembersArgs {
  conversationId: IdLike;
  currentUserId:  IdLike;
  creatorId:      IdLike | null | undefined;
  page:           PageParams;
}

export interface ListMembersResult {
  members:    ListedMember[];
  pagination: PageEnvelope;
}

/**
 * Paginated roster for a conversation. Owner-first, then by join time,
 * with `_id` as the deterministic tiebreaker.
 *
 * Uses the `{ conversationId, joinedAt }` index for an IXSCAN-backed sort
 * plus a bounded `$lookup` into `users` for display fields.
 */
export const listMembers = async ({
  conversationId,
  currentUserId,
  creatorId,
  page,
}: ListMembersArgs): Promise<ListMembersResult> => {
  const convObjId = toObjectId(conversationId);
  const currentStr = String(currentUserId);
  const creatorStr = creatorId ? String(creatorId) : null;

  const [total, rows] = await Promise.all([
    ConversationParticipant.countDocuments({ conversationId: convObjId }),
    ConversationParticipant.aggregate<{
      _id:      mongoose.Types.ObjectId;
      name:     string;
      username: string;
      avatar?:  string;
      bio?:     string;
      role:     'owner' | 'member';
      joinedAt: Date;
    }>([
      { $match: { conversationId: convObjId } },
      { $addFields: { ownerRank: { $cond: [{ $eq: ['$role', 'owner'] }, 0, 1] } } },
      { $sort: { ownerRank: 1, joinedAt: 1, _id: 1 } },
      { $skip:  page.skip },
      { $limit: page.limit },
      {
        $lookup: {
          from:         'users',
          localField:   'userId',
          foreignField: '_id',
          as:           'user',
          pipeline: [{ $project: { name: 1, username: 1, avatar: 1, bio: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:      '$user._id',
          name:     '$user.name',
          username: '$user.username',
          avatar:   '$user.avatar',
          bio:      '$user.bio',
          role:     1,
          joinedAt: 1,
        },
      },
    ]),
  ]);

  const members: ListedMember[] = rows
    .filter((r) => r._id) // drop rows whose user was deleted
    .map((r) => {
      const idStr = r._id.toString();
      return {
        _id:       idStr,
        name:      r.name,
        username:  r.username,
        avatar:    r.avatar,
        bio:       r.bio,
        role:      r.role,
        joinedAt:  r.joinedAt,
        isCreator: creatorStr !== null && idStr === creatorStr,
        isYou:     idStr === currentStr,
      };
    });

  return {
    members,
    pagination: buildPageEnvelope(total, page),
  };
};
