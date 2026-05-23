// ─────────────────────────────────────────────────────────────────────────────
// chat.controller
//
// Full chat system endpoints. Conversations can be:
//   - direct  : 1-on-1 (auto-created on first message, or explicitly)
//   - group   : multi-user, titled, with admin management
//   - system  : one-way notifications (no reply); created programmatically
//
// Message fetch uses cursor-based pagination (same as issue chat).
// Read state uses monotonic pointer cursors.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  Conversation,
  ConversationParticipant,
  ChatMessage,
  ChatReadCursor,
} from '../models/chat.model.js';
import {
  syncParticipants,
  removeParticipantRow,
  listMembers,
  isParticipant,
  forEachParticipant,
} from '../services/chat/conversationParticipants.service.js';
import {
  createDirectConversation,
  createGroupConversation,
} from '../services/chat/conversationCreator.service.js';
import { User } from '../models/user.model.js';
import { Team, TeamMember } from '../models/team.model.js';
import { requireAuthUser } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope, PAGINATION } from '../utils/pagination.js';
import { validatePublicName } from '../utils/publicName.util.js';
import {
  loadLatest,
  loadOlder,
  loadNewer,
  loadAround,
  loadWithAnchor,
} from '../services/chat/chatMessageFetch.service.js';
import { markSentMessageRead, advanceCursorTo } from '../services/chat/chatReadCursor.service.js';
import { recordReads } from '../services/chat/messageRead.service.js';
import {
  getChatMessagesNamespace,
  getChatListNamespace,
} from '../socket/index.js';
import { emitNewMessage, emitMessageDeleted, emitChatReceipts } from '../socket/channels/chat-messages.channel.js';
import { emitChatUnreadChanged, emitConversationUpdated, emitNewConversation } from '../socket/channels/chat-list.channel.js';
import { decorateMessages, broadcastNewConversation } from './chat/chat.helpers.js';
import { guardTokens } from '../services/subscription/tokenGuard.js';
import { validateIncomingMessage, buildPreviewText } from '../services/chat/contentTypeValidator.js';
import { withOptionalTransaction, withSession } from '../utils/transaction.util.js';
import type { ChatMessageDoc } from '../models/chat.model.js';
import conversationService from '../services/chat/conversation.service.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Helper to get a fully decorated single conversation using the aggregation pipeline.
 */
const getDecoratedConversation = async (
  conversationId: mongoose.Types.ObjectId,
  viewerId: mongoose.Types.ObjectId,
) => {
  const pipeline = conversationService.buildSingleConversationPipeline({
    conversationId,
    viewerId,
  });
  const result = await Conversation.aggregate(pipeline);
  return result[0] || null;
};

// ── Conversations ────────────────────────────────────────────────────────────

/**
 * GET /api/chat/conversations
 * List conversations for the authenticated user, sorted by last activity.
 *
 * Reads the user's membership rows to get candidate conversationIds, then
 * pages the Conversation collection by `lastMessageAt`. Participants on each
 * returned conversation are hydrated via a single bulk lookup.
 */

export const getConversations = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = requireAuthUser(req);

    const viewerId = new mongoose.Types.ObjectId(
      String(user._id)
    );

    const { page, limit, skip } = parsePage(req, 20);

    const q =
      typeof req.query.q === 'string'
        ? req.query.q.trim()
        : '';

    const typeParam =
      typeof req.query.type === 'string'
        ? req.query.type
        : '';

    const allowedTypes = [
      'direct',
      'group',
      'system',
      'api',
    ] as const;

    const typeFilter =
      allowedTypes.includes(typeParam as any)
        ? typeParam
        : '';

    const sortBy =
      typeof req.query.sortBy === 'string'
        ? (req.query.sortBy as
          | 'activity'
          | 'created'
          | 'name')
        : 'activity';

    const dir: 1 | -1 =
      req.query.sortOrder === 'asc'
        ? 1
        : -1;

    const pipeline =
      conversationService.buildAggregationPipeline({
        viewerId,
        q,
        typeFilter,
        sortBy,
        dir,
        skip,
        limit,
      });

    const result =
      await ConversationParticipant.aggregate(pipeline);

    const rows = result[0]?.rows || [];

    const total =
      result[0]?.total?.[0]?.count || 0;

    return res.json({
      success: true,
      conversations: rows,
      pagination: buildPageEnvelope(total, {
        page,
        limit,
        skip,
      }),
    });
  } catch (e: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(e),
    });
  }
};
/**
 * POST /api/chat/conversations
 * Create a new conversation. For `direct`, finds existing or creates one.
 * Body: { type, participantIds: string[], title? }
 */
export const createConversation = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const { type, participantIds, title, publicName } = req.body;

    if (!type || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ success: false, message: 'type and participantIds are required' });
    }

    // publicName rules:
    //   • group  — required from the caller (the user chooses the slug)
    //   • direct — auto-generated below (after we know the pair)
    //   • system — auto-generated by systemMessage.service (not this path)
    //
    // Uniqueness is enforced by the partial index on publicName; we catch
    // E11000 on save and surface a 409.
    let groupPublicName: string | undefined;
    if (type === 'group') {
      if (publicName === undefined || publicName === null || publicName === '') {
        return res.status(400).json({ success: false, message: 'publicName is required for group conversations' });
      }
      const check = validatePublicName(String(publicName));
      if (!check.ok || !check.value) {
        return res.status(400).json({ success: false, message: check.error });
      }
      groupPublicName = check.value;
    } else if (publicName !== undefined && publicName !== null && publicName !== '') {
      return res.status(400).json({ success: false, message: 'publicName is only user-settable on group conversations' });
    }

    const viewerId = new mongoose.Types.ObjectId(String(userId));
    const allParticipants = Array.from(
      new Set([
        String(userId),
        ...participantIds.map((id) => String(id)),
      ])
    );

    if (type === 'direct') {
      if (allParticipants.length !== 2) {
        return res.status(400).json({ success: false, message: 'Direct chats need exactly 2 participants' });
      }
      const [a, b] = allParticipants as [string, string];

      const { conversation: direct, existing } = await createDirectConversation({
        userA: a,
        userB: b,
        createdBy: userId,
      });

      const decorated = await getDecoratedConversation(direct._id, viewerId);
      if (existing) {
        return res.json({ success: true, conversation: decorated, existing: true });
      }

      if (decorated) {
        broadcastNewConversation(allParticipants, String(userId), decorated);
      }
      return res.status(201).json({ success: true, conversation: decorated });
    }

    if (type === 'group') {
      if (allParticipants.length < 2) {
        return res.status(400).json({ success: false, message: 'Groups need at least 2 participants' });
      }

      const result = await createGroupConversation({
        title: title || 'Group Chat',
        publicName: groupPublicName!,
        participantIds: allParticipants,
        createdBy: userId,
      });
      if (!result.ok) {
        return res.status(409).json({ success: false, message: 'Public name is already taken' });
      }

      const decorated = await getDecoratedConversation(result.conversation._id, viewerId);
      if (decorated) {
        broadcastNewConversation(allParticipants, String(userId), decorated);
      }
      return res.status(201).json({ success: true, conversation: decorated });
    }

    return res.status(400).json({ success: false, message: 'Invalid conversation type' });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/conversations/:id
 * Get a single conversation with participants populated.
 */
export const getConversation = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = requireAuthUser(req);
    const viewerId = new mongoose.Types.ObjectId(
      String(user._id),
    );

    const conversationId =
      new mongoose.Types.ObjectId(
        String(req.params.id),
      );

    const isMember = await isParticipant(
      conversationId.toString(),
      viewerId,
    );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const pipeline =
      conversationService.buildSingleConversationPipeline(
        {
          conversationId,
          viewerId,
        },
      );

    const result =
      await Conversation.aggregate(pipeline);

    const conversation = result[0];

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    return res.json({
      success: true,
      conversation,
    });
  } catch (e: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(e),
    });
  }
};

/**
 * GET /api/chat/conversations/:id/members
 *
 * Paginated list of members for a conversation the caller participates in.
 * Reads from the ConversationParticipant collection with an indexed
 * { conversationId, joinedAt } pagination, joining to User for display fields.
 *
 * Query: ?page=&limit=
 * Returns: { members, pagination, conversation: { _id, type, title, createdBy } }
 */
export const getConversationMembers = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation id' });
    }

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const conversation = await Conversation.findById(
      conversationId,
      { _id: 1, type: 1, title: 1, createdBy: 1, publicName: 1 },
    ).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const page = parsePage(req, 15);
    const { members, pagination } = await listMembers({
      conversationId: conversation._id as mongoose.Types.ObjectId,
      currentUserId: String(userId),
      creatorId: conversation.createdBy as mongoose.Types.ObjectId | null | undefined,
      page,
    });

    res.json({
      success: true,
      members,
      pagination,
      conversation: {
        _id: conversation._id,
        type: conversation.type,
        title: conversation.title ?? null,
        createdBy: conversation.createdBy ?? null,
        publicName: conversation.publicName ?? null,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * PATCH /api/chat/conversations/:id
 * Update group title or avatar. Only group conversations.
 */
export const updateConversation = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;
    const { title, avatarUrl } = req.body;

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(404).json({ success: false, message: 'Conversation not found or not a group' });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, type: 'group' },
      { ...(title && { title }), ...(avatarUrl && { avatarUrl }) },
      { returnDocument: 'after' },
    ).lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or not a group' });
    }

    const viewerId = new mongoose.Types.ObjectId(String(userId));
    const populated = await getDecoratedConversation(conversation._id, viewerId);
    res.json({ success: true, conversation: populated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/conversations/:id/participants
 * Add participants to a group conversation.
 * Body: { userIds: string[] }
 */
export const addParticipants = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds required' });
    }

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(404).json({ success: 'Group not found' });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, type: 'group' }).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    await syncParticipants(
      conversation._id as mongoose.Types.ObjectId,
      userIds,
      {
        ...(conversation.createdBy && { creatorId: conversation.createdBy as mongoose.Types.ObjectId }),
        addedBy: userId,
      },
    );

    const viewerId = new mongoose.Types.ObjectId(String(userId));
    const fresh = await Conversation.findById(conversation._id).lean();
    const populated = fresh ? await getDecoratedConversation(fresh._id, viewerId) : null;

    // Notify newly added participants with the populated doc.
    if (populated) {
      const chatListNs = getChatListNamespace();
      for (const uid of userIds) {
        emitNewConversation(chatListNs, uid, populated as any);
      }
    }

    res.json({ success: true, conversation: populated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * DELETE /api/chat/conversations/:id/participants/:userId
 * Remove a participant (or leave) a group conversation.
 */
export const removeParticipant = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const currentUserId = user._id;
    const conversationId = req.params.id as string;
    const targetUserId = req.params.userId as string;

    if (!(await isParticipant(conversationId, currentUserId))) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, type: 'group' });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isCreator = conversation.createdBy?.toString() === String(currentUserId);
    const isSelf = String(currentUserId) === targetUserId;

    if (!isCreator && !isSelf) {
      return res.status(403).json({ success: false, message: 'Only the group creator can remove others' });
    }

    // Service call removes the membership row AND refreshes participantCount.
    await removeParticipantRow(conversation._id as mongoose.Types.ObjectId, targetUserId);

    // Deactivate empty / near-empty groups based on the refreshed count.
    const refreshed = await Conversation.findById(conversation._id);
    if (refreshed && refreshed.participantCount < 2 && refreshed.isActive) {
      refreshed.isActive = false;
      await refreshed.save();
    }

    const viewerId = new mongoose.Types.ObjectId(String(currentUserId));
    const finalLean = await Conversation.findById(conversation._id).lean();
    const populated = finalLean ? await getDecoratedConversation(finalLean._id, viewerId) : null;

    res.json({ success: true, conversation: populated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── Messages ─────────────────────────────────────────────────────────────────

/**
 * GET /api/chat/conversations/:id/messages
 * Cursor-based paginated messages.
 *
 *   ?before=<cursor>   → older page (paginate up)
 *   ?after=<cursor>    → newer page (paginate down)
 *   ?around=<msgId>    → centered window (jump-to-message)
 *   ?anchor=<msgId>    → explicit "open at last-read" hint
 *   (none)             → **smart initial load** — server checks ChatReadCursor
 *                        for this user. If there are unread messages, loads
 *                        centered on the last-read message so the client lands
 *                        at the unread boundary. Otherwise loads the latest page.
 *
 * Response always includes `lastReadMessageId` (if available) so the client can
 * render the "unread messages" divider without a separate API call.
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const userObjId = new mongoose.Types.ObjectId(String(userId));
    const conversationId = req.params.id as string;
    const convObjId = new mongoose.Types.ObjectId(conversationId);

    // Verify caller is a member of this conversation.
    if (!(await isParticipant(conversationId, userId))) {
      return res.status(403).json({ success: false, message: 'Not a participant' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, PAGINATION.MAX_LIMIT);
    const before = req.query.before as string | undefined;
    const after = req.query.after as string | undefined;
    const around = req.query.around as string | undefined;
    const anchor = req.query.anchor as string | undefined;
    const latest = req.query.latest === 'true';

    // Look up the user's read cursor for this conversation — needed for both
    // smart initial load and for returning lastReadMessageId in the response.
    const readCursor = await ChatReadCursor.findOne(
      { userId: userObjId, conversationId: convObjId },
      { lastReadMessageId: 1, lastReadAt: 1 },
    ).lean();

    const lastReadMsgId = readCursor?.lastReadMessageId?.toString() ?? null;

    let result;
    if (latest) result = await loadLatest(conversationId, limit);
    else if (before) result = await loadOlder(conversationId, before, limit);
    else if (after) result = await loadNewer(conversationId, after, limit);
    else if (around) result = await loadAround(conversationId, around, limit);
    else if (anchor) result = await loadWithAnchor(conversationId, anchor, limit);
    else {
      // ── Smart initial load ──────────────────────────────────────────────
      // Check if there are unread messages (foreign messages after the cursor).
      // If yes → load centered on the last-read message (anchor pattern).
      // If no  → load latest page (scroll-to-bottom).
      if (lastReadMsgId) {
        const unreadCount = await ChatMessage.countDocuments({
          conversationId: convObjId,
          senderId: { $ne: userObjId },
          createdAt: { $gt: readCursor!.lastReadAt },
        });

        if (unreadCount > 0) {
          result = await loadWithAnchor(conversationId, lastReadMsgId, limit);
        } else {
          result = await loadLatest(conversationId, limit);
        }
      } else {
        result = await loadLatest(conversationId, limit);
      }
    }

    if (!result) {
      return res.status(404).json({ success: false, message: 'Target message not found' });
    }

    const decorated = await decorateMessages(result.messages, { userId: String(userId) });

    res.json({
      success: true,
      ...result,
      messages: decorated,
      // Always include the last-read message ID so the client can render
      // the "unread messages" divider without a separate API call.
      lastReadMessageId: lastReadMsgId,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message. System conversations reject user replies.
 * Body: { text, replyTo?: { messageId, senderName, text }, contentType? }
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(404).json({ success: false, message: 'Conversation not found or inactive' });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, isActive: true });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or inactive' });
    }

    // System conversations don't accept user replies
    if (conversation.type === 'system') {
      return res.status(403).json({ success: false, message: 'Cannot reply to system conversations' });
    }

    const validation = validateIncomingMessage(req.body ?? {});
    if (!validation.ok) {
      return res.status(400).json({ success: false, reason: validation.reason });
    }
    const normalized = validation.message;

    // Token metering — debit before persisting. On overflow the guard writes
    // the 402 response itself; we just short-circuit. Use the rendered text
    // so non-text messages still meter proportionally to their preview.
    const meterInput = normalized.text || normalized.emoji || '';
    const previewText = buildPreviewText(normalized);

    // Atomic debit + message-create + conversation-denorm. Returns a tagged
    // union so we can write the 402 response OUTSIDE the transaction without
    // throw/catch control flow. The idempotent cursor advance + socket emits
    // stay outside.
    type TxResult =
      | { ok: true; message: ChatMessageDoc; tokens: NonNullable<Awaited<ReturnType<typeof guardTokens>>> }
      | { ok: false; status: number; body: Record<string, unknown> };

    const outcome = await withOptionalTransaction<TxResult>(async (rawSession) => {
      const session = rawSession ?? undefined;
      const tokens = await guardTokens(String(userId), meterInput, res, { session });
      if (!tokens) {
        // guardTokens already wrote the 402 response — signal caller to bail.
        return { ok: false, status: 402, body: {} };
      }

      const [createdMessage] = await ChatMessage.create(
        [{
          conversationId,
          senderId: userId,
          senderName: user.name,
          contentType: normalized.contentType,
          text: normalized.text,
          attachments: normalized.attachments,
          isSystem: false,
          ...(normalized.emoji !== undefined && { emoji: normalized.emoji }),
          ...(normalized.contact !== undefined && { contact: normalized.contact }),
          ...(normalized.location !== undefined && { location: normalized.location }),
          ...(normalized.date !== undefined && { date: normalized.date }),
          ...(normalized.event !== undefined && { event: normalized.event }),
          ...(normalized.replyTo && {
            replyTo: {
              messageId: normalized.replyTo.messageId,
              senderName: normalized.replyTo.senderName,
              text: normalized.replyTo.text,
            },
          }),
        }],
        withSession(session),
      );
      const message = createdMessage!;

      await Conversation.updateOne(
        { _id: conversationId },
        {
          $set: {
            lastMessageId: message._id,
            lastMessageAt: message.createdAt,
            lastMessageText: previewText,
            lastMessageSender: user.name,
          },
          $inc: { messageCount: 1 },
        },
        withSession(session),
      );

      return { ok: true, message, tokens };
    });

    if (!outcome.ok) {
      if (outcome.status === 402) return; // response already written by guardTokens
      return res.status(outcome.status).json({ success: false, ...outcome.body });
    }

    const { message, tokens } = outcome;

    const decorated = {
      ...message.toObject(),
      isYou: true,
      deliveryStatus: 'sent',
    };

    // Socket: broadcast to conversation room
    const chatMsgNs = getChatMessagesNamespace();
    emitNewMessage(chatMsgNs, conversationId, {
      ...message.toObject(),
      deliveryStatus: 'sent',
    });

    // Socket: notify all OTHER participants about unread + list update.
    // Uses delta-style hint (count: -1) — the client refetches the canonical
    // map on receipt. This avoids N+1 per-participant unread-count queries.
    //
    // Streams membership via a server-side cursor so fan-out on large groups
    // doesn't buffer the whole roster.
    const chatListNs = getChatListNamespace();
    const nextMessageCount = conversation.messageCount + 1;
    await forEachParticipant(conversationId, (pid) => {
      const pidStr = pid.toString();
      // We no longer skip the sender (selfIdStr).
      // This ensures that if the user has multiple tabs/devices open, 
      // all of them receive the update and stay in sync.

      emitChatUnreadChanged(chatListNs, pidStr, {
        conversationId,
        count: -1, // delta hint — client refetches
      });

      emitConversationUpdated(chatListNs, pidStr, {
        conversationId,
        lastMessageAt: message.createdAt.toISOString(),
        lastMessageText: previewText,
        lastMessageSender: user.name,
        messageCount: nextMessageCount,
      });
    });

    // Advance the sender's read cursor + MessageRead entry to their own send.
    // When a user sends a message they've obviously read everything up to it.
    // Without this, reopening the conversation would show stale "unread" state
    // and the delivery-status aggregation would miss the sender as a reader.
    markSentMessageRead({
      userId: String(userId),
      conversationId,
      messageId: message._id,
      messageCreatedAt: message.createdAt,
    }).catch(() => {/* fire-and-forget */ });

    res.status(201).json({
      success: true,
      message: decorated,
      tokens: { remaining: tokens.remaining, plan: tokens.plan, cost: tokens.cost },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * DELETE /api/chat/conversations/:id/messages/:messageId
 * Delete own message (soft: replaces text with "This message was deleted").
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;
    const messageId = req.params.messageId as string;

    const message = await ChatMessage.findOneAndUpdate(
      { _id: messageId, conversationId, senderId: userId },
      { text: 'This message was deleted', attachments: [], contentType: 'system' as const },
      { returnDocument: 'after' },
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found or not yours' });
    }

    const chatMsgNs = getChatMessagesNamespace();
    emitMessageDeleted(chatMsgNs, conversationId, messageId);

    res.json({ success: true, message });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── Read Receipts ────────────────────────────────────────────────────────────

/**
 * POST /api/chat/conversations/:id/messages/read
 * Body: { messageIds: string[] }
 *
 * Records per-message read receipts for the caller AND advances the
 * conversation read cursor to the max `createdAt` of the supplied messages
 * (so the fast-path unread-count query stays cheap). Broadcasts
 * `receipts_update` with the messageIds that were actually NEWLY marked.
 */
export const markMessagesRead = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = String(user._id);
    const conversationId = req.params.id as string;

    const rawIds = Array.isArray(req.body?.messageIds) ? (req.body.messageIds as unknown[]) : [];
    const messageIds = rawIds
      .filter((x): x is string => typeof x === 'string' && mongoose.isValidObjectId(x))
      .slice(0, 200);

    if (messageIds.length === 0) return res.json({ success: true, markedIds: [] });

    const { insertedIds } = await recordReads({
      conversationId,
      messageIds,
      userId,
    });

    if (insertedIds.length === 0) return res.json({ success: true, markedIds: [] });

    // Advance the per-conversation cursor to the max createdAt among marked.
    const maxMsg = await ChatMessage
      .find({ _id: { $in: insertedIds.map((id) => new mongoose.Types.ObjectId(id)) } }, { createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    if (maxMsg[0]) {
      await advanceCursorTo({
        conversationId,
        userId,
        lastReadAt: maxMsg[0].createdAt as Date,
        lastReadMessageId: maxMsg[0]._id as mongoose.Types.ObjectId,
      });
    }

    // Broadcast only the newly-marked messageIds.
    emitChatReceipts(getChatMessagesNamespace(), conversationId, {
      userId,
      messageIds: insertedIds,
      readAt: new Date().toISOString(),
    });

    // Tell the actor's own other devices to refresh their badge.
    try {
      const chatListNs = getChatListNamespace();
      emitChatUnreadChanged(chatListNs, userId, {
        conversationId,
        count: -1, // delta hint — clients refetch
      });
    } catch { /* socket optional */ }

    res.json({ success: true, markedIds: insertedIds });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── Unread Counts ────────────────────────────────────────────────────────────

/**
 * GET /api/chat/unread-counts
 *
 * Returns the per-conversation unread count and the "last read" anchor for
 * every active conversation the caller belongs to. Conversations with zero
 * unread messages are omitted from `counts` (client assumes missing = 0).
 *
 * Response:
 *   {
 *     counts:      Record<conversationId, number>,
 *     lastReadMap: Record<conversationId, lastReadMessageId>
 *   }
 *
 * Perf notes:
 *   • Conversation memberships come from the `ConversationParticipant`
 *     collection via `getUserConversationIds`, not from an array scan.
 *   • The unread count is a single aggregation with one `$match`-`$or` per
 *     conversation. Each OR clause hits the
 *     `{ conversationId: 1, createdAt: 1, _id: 1 }` compound index, so the
 *     scan is bounded by the unread slice per conversation — no `$lookup`
 *     fanning across the entire message corpus.
 */
export const getUnreadCounts = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const userObjId = new mongoose.Types.ObjectId(String(userId));

    // Narrow to conversations still active AND cap to the 200 most recently
    // active using ConversationParticipant aggregate.
    const UNREAD_CONV_CAP = 200;
    const activeConvs = await ConversationParticipant.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: { userId: userObjId } },
      {
        $lookup: {
          from: 'conversations',
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conv',
        },
      },
      { $unwind: '$conv' },
      { $match: { 'conv.isActive': true } },
      { $replaceRoot: { newRoot: '$conv' } },
      { $project: { _id: 1, lastMessageAt: 1, updatedAt: 1 } },
      { $sort: { lastMessageAt: -1, updatedAt: -1 } },
      { $limit: UNREAD_CONV_CAP },
    ]);

    if (activeConvs.length === 0) {
      return res.json({ success: true, counts: {}, lastReadMap: {} });
    }
    const convIds = activeConvs.map((c) => c._id);

    // This user's read cursor for each active conversation.
    const cursors = await ChatReadCursor.find(
      { userId: userObjId, conversationId: { $in: convIds } },
      { conversationId: 1, lastReadAt: 1, lastReadMessageId: 1, _id: 0 },
    ).lean();

    const cursorByConv = new Map<string, { lastReadAt: Date; lastReadMessageId: mongoose.Types.ObjectId | null }>();
    for (const c of cursors) {
      cursorByConv.set(c.conversationId.toString(), {
        lastReadAt: c.lastReadAt,
        lastReadMessageId: (c.lastReadMessageId ?? null) as mongoose.Types.ObjectId | null,
      });
    }

    // Build one index-friendly clause per conversation:
    //   • With a cursor  →  createdAt > lastReadAt, plus not-mine
    //   • Without cursor →  all foreign messages are unread
    // Each clause is served by the (conversationId, createdAt, _id) index.
    const orClauses: Record<string, unknown>[] = convIds.map((cid) => {
      const cur = cursorByConv.get(cid.toString());
      const base: Record<string, unknown> = { conversationId: cid, senderId: { $ne: userObjId } };
      if (cur) base.createdAt = { $gt: cur.lastReadAt };
      return base;
    });

    // Cap the count at `UNREAD_COUNT_CEILING`: once past that, the UI just
    // renders "99+" so extra work is wasted. We stop accumulating per
    // conversation once its bucket reaches the ceiling.
    const UNREAD_COUNT_CEILING = 100;
    const grouped = await ChatMessage.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { $or: orClauses } },
      {
        $group: {
          _id: '$conversationId',
          count: { $sum: 1 },
        },
      },
      { $addFields: { count: { $min: ['$count', UNREAD_COUNT_CEILING] } } },
    ]);

    const counts: Record<string, number> = {};
    for (const row of grouped) counts[row._id.toString()] = row.count;

    // Surface last-read anchors only for conversations that actually have
    // unread messages — the client uses this to jump-to-backlog on open.
    const lastReadMap: Record<string, string | null> = {};
    for (const [convIdStr, cur] of cursorByConv) {
      if (counts[convIdStr] !== undefined && cur.lastReadMessageId) {
        lastReadMap[convIdStr] = cur.lastReadMessageId.toString();
      }
    }

    res.json({ success: true, counts, lastReadMap });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── User Search (for starting new conversations) ────────────────────────────

/**
 * GET /api/chat/users/search?q=<query>
 * Search users by name or username. Returns paginated results excluding self.
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const q = (req.query.q as string) || '';
    const { page, limit, skip } = parsePage(req, 15);

    if (!q.trim()) {
      return res.json({ success: true, users: [], pagination: buildPageEnvelope(0, { page, limit, skip }) });
    }

    const regex = new RegExp(q.trim(), 'i');
    const filter = {
      _id: { $ne: userId },
      $or: [{ name: regex }, { username: regex }],
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name username avatar bio')
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
      pagination: buildPageEnvelope(total, { page, limit, skip }),
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── Teams & Agent Assignment ───────────────────────────────────────────────

/**
 * POST /api/chat/conversations/:id/assign-agent
 * Assign an agent (team of type 'agent') to a conversation.
 * Body: { agentId: string }
 */
export const assignAgentToConversation = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agentId is required' });
    }

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(403).json({ success: false, message: 'Not a participant of this conversation' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Find the active team/agent
    const orConditions: Array<Record<string, unknown>> = [];
    if (mongoose.isValidObjectId(agentId)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(agentId) });
    }
    orConditions.push({ publicName: String(agentId).toLowerCase() });

    const team = await Team.findOne({
      $or: orConditions,
      type: 'agent',
      isActive: true,
    });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Agent/Team not found or inactive' });
    }

    // Get all active team members
    const members = await TeamMember.find({ teamId: team._id, isActive: true }).lean();
    if (members.length === 0) {
      return res.status(400).json({ success: false, message: 'This agent team has no active members' });
    }

    const memberUserIds = members.map((m) => m.memberId);

    // Sync participants with parentId set to the Team's ID
    await syncParticipants(conversation._id, memberUserIds, {
      addedBy: userId,
      parentId: team._id,
    });

    const viewerId = new mongoose.Types.ObjectId(String(userId));
    const users = await User.find({ _id: { $in: memberUserIds } }, { name: 1, email: 1, username: 1 }).lean();

    conversation.assignedTeam = {
      _id: team._id,
      name: team.name,
      publicName: team.publicName,
      type: team.type,
    };
    conversation.assignedTeamMembers = users.map((u) => ({
      userId: new mongoose.Types.ObjectId(String(u._id)),
      name: u.name,
      email: u.email,
      username: u.username,
    }));

    await conversation.save();

    const populated = await getDecoratedConversation(conversation._id, viewerId);

    res.json({
      success: true,
      message: 'Agent assigned to conversation successfully',
      conversation: populated,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/teams
 * Create a new team/agent.
 * Body: { name, publicName, type }
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const { name, publicName, type } = req.body;

    if (!name || !publicName || !type) {
      return res.status(400).json({ success: false, message: 'name, publicName, and type are required' });
    }

    if (!['agent', 'team'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid team type' });
    }

    // Check if publicName is already taken
    const existing = await Team.findOne({ publicName: publicName.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Team publicName is already taken' });
    }

    const team = await Team.create({
      ownerId: user._id,
      name,
      publicName: publicName.toLowerCase(),
      type,
    });

    // Automatically add the owner as an active member of the team
    await TeamMember.create({
      memberId: user._id,
      teamId: team._id,
      isActive: true,
    });

    res.status(201).json({ success: true, team });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/teams
 * Get all teams where the user is an owner or a member.
 */
export const getMyTeams = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;

    // Find teams where user is owner
    const ownedTeams = await Team.find({ ownerId: userId, isActive: true }).lean();

    // Find teams where user is a member
    const memberRecords = await TeamMember.find({ memberId: userId, isActive: true }).lean();
    const teamIds = memberRecords.map((mr) => mr.teamId);

    const memberTeams = await Team.find({
      _id: { $in: teamIds },
      ownerId: { $ne: userId },
      isActive: true,
    }).lean();

    res.json({
      success: true,
      teams: {
        owned: ownedTeams,
        joined: memberTeams,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/teams/:id/members
 * Add a member to a team.
 * Body: { memberId: string }
 */
export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const teamId = req.params.id;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'memberId is required' });
    }

    const team = await Team.findOne({ _id: teamId, isActive: true });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.ownerId.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only team owner can add members' });
    }

    // Check if target user exists
    const targetUser = await User.findById(memberId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Member user not found' });
    }

    // Idempotently create or activate membership
    const updated = await TeamMember.findOneAndUpdate(
      { teamId: team._id, memberId: targetUser._id },
      { isActive: true, joinedAt: new Date() },
      { upsert: true, new: true },
    );

    res.json({ success: true, member: updated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * DELETE /api/chat/teams/:id/members/:memberId
 * Remove a member from a team.
 */
export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const teamId = req.params.id;
    const targetMemberId = req.params.memberId;

    const team = await Team.findOne({ _id: teamId, isActive: true });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isOwner = team.ownerId.toString() === user._id.toString();
    const isSelf = user._id.toString() === targetMemberId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, message: 'Only team owner or the member themselves can leave/remove' });
    }

    // Soft remove: set isActive to false
    const updated = await TeamMember.findOneAndUpdate(
      { teamId: team._id, memberId: new mongoose.Types.ObjectId(String(targetMemberId)) },
      { isActive: false },
      { new: true },
    );

    res.json({ success: true, member: updated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/teams/:id/members
 * Get all active members of a team populated with user details (paginated).
 */
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const teamId = req.params.id;
    const { page, limit, skip } = parsePage(req, 15);

    const team = await Team.findOne({ _id: teamId, isActive: true });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Verify user is owner or member
    const isOwner = team.ownerId.toString() === user._id.toString();
    const isMember = await TeamMember.exists({ teamId: team._id, memberId: user._id, isActive: true });

    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied to this team' });
    }

    const filter = { teamId: team._id, isActive: true };

    const [members, total] = await Promise.all([
      TeamMember.find(filter)
        .skip(skip)
        .limit(limit)
        .lean(),
      TeamMember.countDocuments(filter),
    ]);

    const memberUserIds = members.map((m) => m.memberId);
    const users = await User.find({ _id: { $in: memberUserIds } }, { name: 1, email: 1, username: 1, avatar: 1 }).lean();

    const result = members.map((m) => {
      const u = users.find((usr) => usr._id.toString() === m.memberId.toString());
      return {
        _id: m._id,
        memberId: m.memberId,
        isActive: m.isActive,
        joinedAt: m.joinedAt,
        user: u ? {
          _id: u._id,
          name: u.name,
          username: u.username,
          email: u.email,
          avatar: u.avatar,
        } : null,
      };
    });

    res.json({
      success: true,
      members: result,
      pagination: buildPageEnvelope(total, { page, limit, skip }),
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/conversations/:id/unassign-agent
 * Unassign agent from a conversation, clearing assignedTeam and removing synced participants.
 */
export const unassignAgentFromConversation = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(403).json({ success: false, message: 'Not a participant of this conversation' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const teamId = conversation.assignedTeam?._id;
    if (teamId) {
      // Remove all participants who were synced with this parentId
      await ConversationParticipant.deleteMany({
        conversationId: conversation._id,
        parentId: teamId,
      });

      // Update denormalized participant count
      const count = await ConversationParticipant.countDocuments({ conversationId: conversation._id });
      conversation.participantCount = count;
    }

    conversation.assignedTeam = undefined as any;
    conversation.assignedTeamMembers = undefined as any;

    await conversation.save();

    const viewerId = new mongoose.Types.ObjectId(String(userId));
    const populated = await getDecoratedConversation(conversation._id, viewerId);

    res.json({
      success: true,
      message: 'Agent unassigned from conversation successfully',
      conversation: populated,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

