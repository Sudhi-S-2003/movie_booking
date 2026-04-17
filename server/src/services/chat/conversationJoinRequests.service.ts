// ─────────────────────────────────────────────────────────────────────────────
// conversationJoinRequests.service
//
// Workflow primitives for the "request to join a public group" flow.
// Every function is single-responsibility so controllers can compose them
// without duplicating membership / status checks.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { ConversationJoinRequest } from '../../models/chatInvite.model.js';
import type {
  ConversationJoinRequestDoc,
  JoinRequestStatus,
} from '../../models/chatInvite.model.js';
import { User } from '../../models/user.model.js';
import { buildPageEnvelope } from '../../utils/pagination.js';
import type { PageParams, PageEnvelope } from '../../utils/pagination.js';

type IdLike = mongoose.Types.ObjectId | string;

const toObjectId = (v: IdLike) => new mongoose.Types.ObjectId(String(v));

// ─── Submission ─────────────────────────────────────────────────────────────

export interface SubmitJoinRequestArgs {
  conversationId: IdLike;
  userId:         IdLike;
  message?:       string;
}

export interface SubmitJoinRequestResult {
  request:  ConversationJoinRequestDoc;
  created:  boolean; // false → there was already a pending request
}

/**
 * Idempotent: if a pending request already exists for (conversation, user),
 * return it with `created: false`. Otherwise insert a new pending row.
 */
export const submitJoinRequest = async ({
  conversationId,
  userId,
  message,
}: SubmitJoinRequestArgs): Promise<SubmitJoinRequestResult> => {
  const convObj = toObjectId(conversationId);
  const userObj = toObjectId(userId);

  const existing = await ConversationJoinRequest.findOne({
    conversationId: convObj,
    userId:         userObj,
    status:         'pending',
  });
  if (existing) return { request: existing, created: false };

  const request = await ConversationJoinRequest.create({
    conversationId: convObj,
    userId:         userObj,
    status:         'pending',
    ...(message && { message: message.slice(0, 500) }),
  });

  return { request, created: true };
};

// ─── Lookups ────────────────────────────────────────────────────────────────

/** Is there an outstanding pending request from this user for this chat? */
export const hasPendingRequest = async (
  conversationId: IdLike,
  userId:         IdLike,
): Promise<boolean> => {
  const exists = await ConversationJoinRequest.exists({
    conversationId: toObjectId(conversationId),
    userId:         toObjectId(userId),
    status:         'pending',
  });
  return exists !== null;
};

/** Count pending requests for the owner's badge. */
export const countPending = (conversationId: IdLike): Promise<number> =>
  ConversationJoinRequest.countDocuments({
    conversationId: toObjectId(conversationId),
    status:         'pending',
  });

// ─── Paginated listing for owner review ─────────────────────────────────────

export interface ListedJoinRequest {
  _id:       string;
  user:      { _id: string; name: string; username: string; avatar?: string };
  status:    JoinRequestStatus;
  message?:  string;
  createdAt: Date;
}

export interface ListRequestsResult {
  requests:   ListedJoinRequest[];
  pagination: PageEnvelope;
}

export interface ListRequestsArgs {
  conversationId: IdLike;
  status?:        JoinRequestStatus;
  page:           PageParams;
}

export const listRequests = async ({
  conversationId,
  status = 'pending',
  page,
}: ListRequestsArgs): Promise<ListRequestsResult> => {
  const filter = { conversationId: toObjectId(conversationId), status };

  const [rows, total] = await Promise.all([
    ConversationJoinRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(page.skip)
      .limit(page.limit)
      .lean(),
    ConversationJoinRequest.countDocuments(filter),
  ]);

  const userIds = rows.map((r) => r.userId as mongoose.Types.ObjectId);
  const users = userIds.length
    ? await User.find(
        { _id: { $in: userIds } },
        { name: 1, username: 1, avatar: 1 },
      ).lean()
    : [];
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const requests: ListedJoinRequest[] = rows
    .map((r) => {
      const u = userById.get(String(r.userId));
      if (!u) return null;
      return {
        _id:       r._id.toString(),
        user: {
          _id:      u._id.toString(),
          name:     u.name as string,
          username: u.username as string,
          ...(u.avatar ? { avatar: u.avatar as string } : {}),
        },
        status:    r.status as JoinRequestStatus,
        ...(r.message ? { message: r.message } : {}),
        createdAt: r.createdAt as Date,
      };
    })
    .filter((x): x is ListedJoinRequest => x !== null);

  return {
    requests,
    pagination: buildPageEnvelope(total, page),
  };
};

// ─── Resolution (approve / reject) ──────────────────────────────────────────

export interface ResolveRequestArgs {
  requestId:      IdLike;
  conversationId: IdLike;
  resolverId:     IdLike;
}

/**
 * Flip a pending request to `status`. Returns the updated document (or null
 * if it was already resolved / not found). Transitioning from `pending` is
 * the only allowed move — re-resolves are rejected by the compound filter.
 */
export const resolveRequest = async (
  args:   ResolveRequestArgs,
  status: 'approved' | 'rejected',
): Promise<ConversationJoinRequestDoc | null> =>
  ConversationJoinRequest.findOneAndUpdate(
    {
      _id:            toObjectId(args.requestId),
      conversationId: toObjectId(args.conversationId),
      status:         'pending',
    },
    {
      $set: {
        status,
        resolvedAt: new Date(),
        resolvedBy: toObjectId(args.resolverId),
      },
    },
    { new: true },
  );
