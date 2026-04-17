// ─────────────────────────────────────────────────────────────────────────────
// chatPublic.controller
//
// Handlers for the public-facing chat onboarding flow:
//
//   • GET  /chat/public/:publicName          — social resolver
//   • POST /chat/conversations/:id/public-name     — owner sets publicName
//   • POST /chat/conversations/:id/join-requests   — request to join a group
//   • GET  /chat/conversations/:id/join-requests   — owner review list
//   • POST /chat/conversations/:id/join-requests/:requestId/approve
//   • POST /chat/conversations/:id/join-requests/:requestId/reject
//   • POST /chat/conversations/:id/invites         — owner creates invite
//   • GET  /chat/conversations/:id/invites         — owner lists invites
//   • DELETE /chat/conversations/:id/invites/:inviteId — owner revokes
//   • GET  /chat/invites/:token                    — invite preview (public)
//   • POST /chat/invites/:token/accept             — accept invite (auth'd)
//
// Every handler is small and single-purpose; shared work (auth gating, owner
// gating, conversation loading) is factored into helpers at the top.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/chat.model.js';
import type { ConversationDoc } from '../models/chat.model.js';
import type { ConversationInviteDoc } from '../models/chatInvite.model.js';
import { requireAuthUser } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage } from '../utils/pagination.js';
import { validatePublicName, normalizePublicName } from '../utils/publicName.util.js';
import {
  isParticipant,
  syncParticipants,
} from '../services/chat/conversationParticipants.service.js';
import {
  submitJoinRequest,
  hasPendingRequest,
  countPending,
  listRequests,
  resolveRequest,
} from '../services/chat/conversationJoinRequests.service.js';
import {
  createInvite,
  listInvites,
  revokeInvite,
  findActiveInvite,
  consumeInvite,
} from '../services/chat/conversationInvites.service.js';

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Narrow req.params.id to a valid ObjectId-or-respond-400. */
const parseConversationId = (req: Request, res: Response): string | null => {
  const id = req.params.id as string;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid conversation id' });
    return null;
  }
  return id;
};

/**
 * Load the conversation and assert the caller is its owner (creator).
 * Responds with 404 / 403 on failure and returns null — caller just exits.
 */
const requireOwnerConversation = async (
  req:     Request,
  res:     Response,
  options: { requireType?: 'group' } = {},
): Promise<{ conversation: ConversationDoc; conversationId: string } | null> => {
  const user = requireAuthUser(req);
  const conversationId = parseConversationId(req, res);
  if (!conversationId) return null;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found' });
    return null;
  }
  if (options.requireType && conversation.type !== options.requireType) {
    res.status(400).json({ success: false, message: `Only ${options.requireType} conversations support this action` });
    return null;
  }
  if (!conversation.createdBy || conversation.createdBy.toString() !== String(user._id)) {
    res.status(403).json({ success: false, message: 'Only the group owner can perform this action' });
    return null;
  }

  return { conversation, conversationId };
};

const publicConversationProjection = {
  _id:              1,
  type:             1,
  title:            1,
  avatarUrl:        1,
  publicName:       1,
  participantCount: 1,
  createdAt:        1,
  isActive:         1,
} as const;

// ─── Public resolver ────────────────────────────────────────────────────────

/**
 * GET /api/chat/public/:publicName
 *
 * Public endpoint. Returns a lightweight preview of the conversation plus
 * the viewer's membership context so the client can route them correctly:
 *
 *   • `membership.isMember: true`      → open the chat
 *   • type !== 'group' and not member  → not viewable (403)
 *   • type === 'group' and not member  → show "request to join" UI
 *   • caller anonymous                 → client sends them to /login
 *
 * Uses `optionalAuthenticate`, so `req.user` may be undefined.
 */
export const getPublicConversation = async (req: Request, res: Response) => {
  try {
    const raw = req.params.publicName as string;
    const publicName = normalizePublicName(raw);
    if (!publicName) {
      return res.status(400).json({ success: false, message: 'publicName is required' });
    }

    const conversation = await Conversation.findOne(
      { publicName, isActive: true },
      publicConversationProjection,
    ).lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    const viewerId = req.user?._id ? String(req.user._id) : null;
    const isMember = viewerId ? await isParticipant(conversation._id as mongoose.Types.ObjectId, viewerId) : false;

    // Direct/system chats are never viewable from a public URL unless you're
    // already a participant — by design.
    if (!isMember && conversation.type !== 'group') {
      return res.status(403).json({ success: false, message: 'This chat is not publicly accessible' });
    }

    const pendingRequest = viewerId && !isMember
      ? await hasPendingRequest(conversation._id as mongoose.Types.ObjectId, viewerId)
      : false;

    return res.json({
      success: true,
      conversation: {
        _id:              conversation._id,
        type:             conversation.type,
        title:            conversation.title ?? null,
        avatarUrl:        conversation.avatarUrl ?? null,
        publicName:       conversation.publicName,
        participantCount: conversation.participantCount,
        createdAt:        conversation.createdAt,
      },
      membership: {
        isMember,
        canRequestToJoin: !isMember && conversation.type === 'group',
        authenticated:    viewerId !== null,
      },
      pendingRequest,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ─── Public name setter ─────────────────────────────────────────────────────

/**
 * POST /api/chat/conversations/:id/public-name
 * Body: { publicName: string }
 *
 * Owner-only. Updates the slug to a new valid, unique value. Clearing is
 * NOT supported — every group has a publicName as part of its identity.
 * Uniqueness is enforced by the partial index → duplicate becomes a 409.
 */
export const setPublicName = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res, { requireType: 'group' });
    if (!gate) return;
    const { conversation } = gate;

    const raw = req.body?.publicName;
    if (raw === undefined || raw === null || raw === '') {
      return res.status(400).json({ success: false, message: 'publicName is required' });
    }

    const check = validatePublicName(typeof raw === 'string' ? raw : '');
    if (!check.ok || !check.value) {
      return res.status(400).json({ success: false, message: check.error });
    }

    conversation.publicName = check.value;
    try {
      await conversation.save();
    } catch (e: unknown) {
      if (e && typeof e === 'object' && (e as { code?: number }).code === 11000) {
        return res.status(409).json({ success: false, message: 'Public name is already taken' });
      }
      throw e;
    }

    res.json({
      success:      true,
      conversation: { _id: conversation._id, publicName: conversation.publicName },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ─── Join requests ──────────────────────────────────────────────────────────

/**
 * POST /api/chat/conversations/:id/join-requests
 * Body: { message? }
 *
 * Member check is the first gate: if the user is already in, we 409 so the
 * client knows to just open the chat.
 */
export const createJoinRequest = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const conversationId = parseConversationId(req, res);
    if (!conversationId) return;

    const conversation = await Conversation.findById(conversationId, { type: 1, isActive: 1 }).lean();
    if (!conversation || !conversation.isActive) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (conversation.type !== 'group') {
      return res.status(400).json({ success: false, message: 'Only group conversations accept join requests' });
    }
    if (await isParticipant(conversationId, user._id)) {
      return res.status(409).json({ success: false, message: 'Already a member', alreadyMember: true });
    }

    const { request, created } = await submitJoinRequest({
      conversationId,
      userId:  user._id,
      message: typeof req.body?.message === 'string' ? req.body.message : undefined,
    });

    res.status(created ? 201 : 200).json({
      success: true,
      request: {
        _id:       request._id,
        status:    request.status,
        createdAt: request.createdAt,
      },
      created,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/conversations/:id/join-requests?status=pending&page=&limit=
 * Owner-only paginated list.
 */
export const listJoinRequests = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res);
    if (!gate) return;

    const rawStatus = (req.query.status as string) || 'pending';
    const status = rawStatus === 'approved' || rawStatus === 'rejected'
      ? rawStatus
      : 'pending';

    const page = parsePage(req, 15);
    const { requests, pagination } = await listRequests({
      conversationId: gate.conversationId,
      status,
      page,
    });

    const pendingTotal = status === 'pending'
      ? pagination.total
      : await countPending(gate.conversationId);

    res.json({ success: true, requests, pagination, pendingTotal });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/conversations/:id/join-requests/:requestId/approve
 * Owner-only. Resolves the request and adds the user as a member.
 */
export const approveJoinRequest = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res);
    if (!gate) return;

    const user = requireAuthUser(req);
    const requestId = req.params.requestId as string;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request id' });
    }

    const request = await resolveRequest(
      { requestId, conversationId: gate.conversationId, resolverId: user._id },
      'approved',
    );
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or already resolved' });
    }

    await syncParticipants(gate.conversationId, [request.userId], {
      ...(gate.conversation.createdBy && { creatorId: gate.conversation.createdBy as mongoose.Types.ObjectId }),
      addedBy: user._id as mongoose.Types.ObjectId,
    });

    res.json({
      success: true,
      request: {
        _id:        request._id,
        status:     request.status,
        resolvedAt: request.resolvedAt,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/conversations/:id/join-requests/:requestId/reject
 * Owner-only. Resolves the request without adding the user.
 */
export const rejectJoinRequest = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res);
    if (!gate) return;

    const user = requireAuthUser(req);
    const requestId = req.params.requestId as string;
    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request id' });
    }

    const request = await resolveRequest(
      { requestId, conversationId: gate.conversationId, resolverId: user._id },
      'rejected',
    );
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or already resolved' });
    }

    res.json({
      success: true,
      request: {
        _id:        request._id,
        status:     request.status,
        resolvedAt: request.resolvedAt,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ─── Invite links ───────────────────────────────────────────────────────────

interface CreateInviteBody {
  expiresInMs?: number;
  maxUses?:     number;
}

/**
 * POST /api/chat/conversations/:id/invites
 * Body: { expiresInMs?, maxUses? }
 * Owner-only.
 */
export const createInviteLink = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res, { requireType: 'group' });
    if (!gate) return;

    const user = requireAuthUser(req);
    const body: CreateInviteBody = req.body ?? {};

    const invite = await createInvite({
      conversationId: gate.conversationId,
      createdBy:      user._id,
      ...(typeof body.expiresInMs === 'number' && { expiresInMs: body.expiresInMs }),
      ...(typeof body.maxUses === 'number'     && { maxUses:     body.maxUses }),
    });

    res.status(201).json({
      success: true,
      invite:  serializeInvite(invite),
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/conversations/:id/invites?page=&limit=
 * Owner-only.
 */
export const listInviteLinks = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res);
    if (!gate) return;

    const page = parsePage(req, 15);
    const { invites, pagination } = await listInvites(gate.conversationId, page);

    res.json({
      success:    true,
      invites:    invites.map(serializeInvite),
      pagination,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * DELETE /api/chat/conversations/:id/invites/:inviteId
 * Owner-only. Soft-revoke.
 */
export const revokeInviteLink = async (req: Request, res: Response) => {
  try {
    const gate = await requireOwnerConversation(req, res);
    if (!gate) return;

    const inviteId = req.params.inviteId as string;
    if (!mongoose.isValidObjectId(inviteId)) {
      return res.status(400).json({ success: false, message: 'Invalid invite id' });
    }

    const invite = await revokeInvite(inviteId, gate.conversationId);
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    res.json({ success: true, invite: serializeInvite(invite) });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/invites/:token
 * Public preview of an invite — returns the associated conversation plus
 * the viewer's current membership state so the UI can show the right CTA.
 */
export const getInviteByToken = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const invite = await findActiveInvite(token);
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite link is invalid or expired' });
    }

    const conversation = await Conversation.findById(
      invite.conversationId,
      publicConversationProjection,
    ).lean();
    if (!conversation || !conversation.isActive) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    if (conversation.type !== 'group') {
      return res.status(400).json({ success: false, message: 'Invite does not point to a group chat' });
    }

    const viewerId = req.user?._id ? String(req.user._id) : null;
    const isMember = viewerId
      ? await isParticipant(conversation._id as mongoose.Types.ObjectId, viewerId)
      : false;

    res.json({
      success: true,
      conversation: {
        _id:              conversation._id,
        type:             conversation.type,
        title:            conversation.title ?? null,
        avatarUrl:        conversation.avatarUrl ?? null,
        publicName:       conversation.publicName ?? null,
        participantCount: conversation.participantCount,
      },
      invite: {
        expiresAt:  invite.expiresAt,
        usesCount:  invite.usesCount,
        maxUses:    invite.maxUses,
      },
      membership: {
        isMember,
        authenticated: viewerId !== null,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/invites/:token/accept
 * Atomic accept. Authenticated users only.
 */
export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const token = req.params.token as string;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const invite = await consumeInvite(token);
    if (!invite) {
      return res.status(410).json({ success: false, message: 'Invite link is invalid or expired' });
    }

    const conversation = await Conversation.findById(
      invite.conversationId,
      { _id: 1, type: 1, createdBy: 1, isActive: 1 },
    ).lean();
    if (!conversation || !conversation.isActive || conversation.type !== 'group') {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    await syncParticipants(
      conversation._id as mongoose.Types.ObjectId,
      [user._id as mongoose.Types.ObjectId],
      {
        ...(conversation.createdBy && { creatorId: conversation.createdBy as mongoose.Types.ObjectId }),
        addedBy: invite.createdBy,
      },
    );

    res.json({
      success:        true,
      conversationId: conversation._id,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ─── Serialization ──────────────────────────────────────────────────────────

const serializeInvite = (invite: ConversationInviteDoc) => ({
  _id:       invite._id,
  token:     invite.token,
  expiresAt: invite.expiresAt,
  maxUses:   invite.maxUses,
  usesCount: invite.usesCount,
  revoked:   invite.revoked,
  createdAt: invite.createdAt,
  createdBy: invite.createdBy,
});
