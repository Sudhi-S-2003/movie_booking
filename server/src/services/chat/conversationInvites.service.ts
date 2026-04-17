// ─────────────────────────────────────────────────────────────────────────────
// conversationInvites.service
//
// Owner-issued invite links. Each invite is a row carrying a random token,
// optional TTL, and optional usage cap. Consumers pass the token to
// `/chat/invites/:token/accept`, which:
//
//   1. Validates the token (exists / not revoked / not expired / not exhausted)
//   2. Atomically increments `usesCount` using `findOneAndUpdate` so concurrent
//      accepts can't race past `maxUses`
//   3. Returns the associated conversation id so the controller can add the
//      user as a participant
//
// Single-responsibility split:
//   • `createInvite`        — owner action (writes one row)
//   • `listInvites`         — paginated read for the manage panel
//   • `revokeInvite`        — soft-revoke (sets `revoked: true`)
//   • `findActiveInvite`    — read-only preview, no side effects
//   • `consumeInvite`       — atomic accept (bumps usesCount exactly once)
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { ConversationInvite } from '../../models/chatInvite.model.js';
import type { ConversationInviteDoc } from '../../models/chatInvite.model.js';
import { buildPageEnvelope } from '../../utils/pagination.js';
import type { PageParams, PageEnvelope } from '../../utils/pagination.js';

type IdLike = mongoose.Types.ObjectId | string;

const toObjectId = (v: IdLike) => new mongoose.Types.ObjectId(String(v));

/** 24 bytes of entropy → 32-char url-safe string. Collision probability ~zero. */
const generateToken = (): string =>
  randomBytes(24).toString('base64url');

// ─── Creation ───────────────────────────────────────────────────────────────

export interface CreateInviteArgs {
  conversationId: IdLike;
  createdBy:      IdLike;
  /** TTL from now in milliseconds. Omit for a non-expiring invite. */
  expiresInMs?:   number;
  /** Max number of accepts. Omit for an unlimited invite. */
  maxUses?:       number;
}

export const createInvite = async (args: CreateInviteArgs): Promise<ConversationInviteDoc> => {
  const expiresAt = args.expiresInMs && args.expiresInMs > 0
    ? new Date(Date.now() + args.expiresInMs)
    : null;

  return ConversationInvite.create({
    conversationId: toObjectId(args.conversationId),
    createdBy:      toObjectId(args.createdBy),
    token:          generateToken(),
    expiresAt,
    maxUses:        args.maxUses && args.maxUses > 0 ? args.maxUses : null,
    usesCount:      0,
    revoked:        false,
  });
};

// ─── Listing ────────────────────────────────────────────────────────────────

export interface ListInvitesResult {
  invites:    ConversationInviteDoc[];
  pagination: PageEnvelope;
}

export const listInvites = async (
  conversationId: IdLike,
  page: PageParams,
): Promise<ListInvitesResult> => {
  const filter = { conversationId: toObjectId(conversationId) };

  const [invites, total] = await Promise.all([
    ConversationInvite.find(filter)
      .sort({ createdAt: -1 })
      .skip(page.skip)
      .limit(page.limit),
    ConversationInvite.countDocuments(filter),
  ]);

  return {
    invites,
    pagination: buildPageEnvelope(total, page),
  };
};

// ─── Revocation ─────────────────────────────────────────────────────────────

export const revokeInvite = async (
  inviteId:       IdLike,
  conversationId: IdLike,
): Promise<ConversationInviteDoc | null> =>
  ConversationInvite.findOneAndUpdate(
    { _id: toObjectId(inviteId), conversationId: toObjectId(conversationId) },
    { $set: { revoked: true } },
    { new: true },
  );

// ─── Lookup helpers ─────────────────────────────────────────────────────────

/**
 * Pure read: returns the invite if the token is live (not revoked, not
 * expired, not exhausted). No mutation. Used for the preview page.
 */
export const findActiveInvite = async (token: string): Promise<ConversationInviteDoc | null> => {
  const invite = await ConversationInvite.findOne({ token });
  if (!invite) return null;
  if (!isLive(invite)) return null;
  return invite;
};

/**
 * Atomic accept. Returns the invite after incrementing `usesCount`; returns
 * null if the token wasn't valid (revoked / expired / exhausted) at the
 * moment of the update.
 *
 * The compound `findOneAndUpdate` filter means two simultaneous accepts
 * can't both push past `maxUses`: MongoDB serializes the increment.
 */
export const consumeInvite = async (token: string): Promise<ConversationInviteDoc | null> => {
  const now = new Date();

  const filter: Record<string, unknown> = {
    token,
    revoked: false,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ maxUses: null },   { $expr: { $lt: ['$usesCount', '$maxUses'] } }] },
    ],
  };

  return ConversationInvite.findOneAndUpdate(
    filter,
    { $inc: { usesCount: 1 } },
    { new: true },
  );
};

const isLive = (invite: ConversationInviteDoc): boolean => {
  if (invite.revoked) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return false;
  if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) return false;
  return true;
};
