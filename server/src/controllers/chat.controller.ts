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
  populateMembers,
  attachDirectPeer,
  getUserConversationIds,
} from '../services/chat/conversationParticipants.service.js';
import {
  createDirectConversation,
  createGroupConversation,
} from '../services/chat/conversationCreator.service.js';
import { User } from '../models/user.model.js';
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

// ── Conversations ────────────────────────────────────────────────────────────

/**
 * GET /api/chat/conversations
 * List conversations for the authenticated user, sorted by last activity.
 *
 * Reads the user's membership rows to get candidate conversationIds, then
 * pages the Conversation collection by `lastMessageAt`. Participants on each
 * returned conversation are hydrated via a single bulk lookup.
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const { page, limit, skip } = parsePage(req, 20);

    const convIds = await getUserConversationIds(userId);
    if (convIds.length === 0) {
      return res.json({
        success: true,
        conversations: [],
        pagination: buildPageEnvelope(0, { page, limit, skip }),
      });
    }

    // Optional query params: q, type, sortBy, sortOrder.
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const typeParam = typeof req.query.type === 'string' ? req.query.type : '';
    const allowedTypes = ['direct', 'group', 'system', 'api'] as const;
    const typeFilter = (allowedTypes as readonly string[]).includes(typeParam)
      ? typeParam
      : '';

    const sortByParam    = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'activity';
    const sortOrderParam = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortField: Record<string, 'activity' | 'created' | 'name'> = {
      activity: 'activity', created: 'created', name: 'name',
    };
    const sortBy = sortField[sortByParam] ?? 'activity';
    const dir: 1 | -1 = sortOrderParam === 'asc' ? 1 : -1;

    const sortSpec: Record<string, 1 | -1> =
      sortBy === 'name'
        ? { title: dir, _id: dir }
        : sortBy === 'created'
          ? { createdAt: dir, _id: dir }
          : { lastMessageAt: dir, updatedAt: dir, _id: dir };

    const filter: Record<string, unknown> = { _id: { $in: convIds }, isActive: true };
    if (typeFilter) filter.type = typeFilter;
    if (q) {
      // Escape regex metachars to avoid injection / invalid-regex errors.
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');

      // Search across four surfaces so the UX matches user expectations:
      //   1. conversation.title                     — groups, named chats
      //   2. conversation.externalUser.name/email   — guest/api conversations
      //   3. peer (registered user) name / username — direct chats whose
      //      `title` is empty and rendered from the opposite participant
      const userMatches = await User
        .find({ $or: [{ name: rx }, { username: rx }] }, { _id: 1 })
        .limit(500)
        .lean();
      const matchedUserIds = userMatches.map((u) => u._id);

      let peerConvIds: mongoose.Types.ObjectId[] = [];
      if (matchedUserIds.length > 0) {
        const peerRows = await ConversationParticipant
          .find(
            { userId: { $in: matchedUserIds }, conversationId: { $in: convIds } },
            { conversationId: 1, _id: 0 },
          )
          .lean();
        peerConvIds = peerRows.map((r) => r.conversationId as mongoose.Types.ObjectId);
      }

      filter.$or = [
        { title: rx },
        { 'externalUser.name':  rx },
        { 'externalUser.email': rx },
        ...(peerConvIds.length > 0 ? [{ _id: { $in: peerConvIds } }] : []),
      ];
    }

    const [rows, total] = await Promise.all([
      Conversation.find(filter)
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    // For direct conversations, fill in `title` + `avatarUrl` from the
    // opposite user so the sidebar can render every row type uniformly
    // without shipping a `participants` array. Groups/system pass through.
    const conversations = await attachDirectPeer(rows, userId);

    res.json({
      success: true,
      conversations,
      pagination: buildPageEnvelope(total, { page, limit, skip }),
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
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

    // Ensure creator is always in participants
    const allParticipants = [...new Set([String(userId), ...participantIds])];

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

      const populated = await populateMembers(direct);
      if (existing) {
        return res.json({ success: true, conversation: populated, existing: true });
      }

      broadcastNewConversation(allParticipants, String(userId), populated);
      return res.status(201).json({ success: true, conversation: populated });
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

      const populated = await populateMembers(result.conversation);
      broadcastNewConversation(allParticipants, String(userId), populated);
      return res.status(201).json({ success: true, conversation: populated });
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
export const getConversation = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const conversationId = req.params.id as string;

    if (!(await isParticipant(conversationId, userId))) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const populated = await populateMembers(conversation);
    res.json({ success: true, conversation: populated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
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

    const populated = await populateMembers(conversation);
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

    const fresh = await Conversation.findById(conversation._id).lean();
    const populated = fresh ? await populateMembers(fresh) : null;

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

    const finalLean = await Conversation.findById(conversation._id).lean();
    const populated = finalLean ? await populateMembers(finalLean) : null;

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

    // Look up the user's read cursor for this conversation — needed for both
    // smart initial load and for returning lastReadMessageId in the response.
    const readCursor = await ChatReadCursor.findOne(
      { userId: userObjId, conversationId: convObjId },
      { lastReadMessageId: 1, lastReadAt: 1 },
    ).lean();

    const lastReadMsgId = readCursor?.lastReadMessageId?.toString() ?? null;

    let result;
    if (before) result = await loadOlder(conversationId, before, limit);
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

    const decorated = await decorateMessages(result.messages, conversationId, { userId: String(userId) });

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
 * Body: { text, replyTo?: { messageId, senderName, text }, messageType? }
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

    const { text, replyTo, messageType } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const message = await ChatMessage.create({
      conversationId,
      senderId: userId,
      senderName: user.name,
      messageType: messageType || 'text',
      text: text.trim(),
      isSystem: false,
      ...(replyTo && {
        replyTo: {
          messageId: replyTo.messageId,
          senderName: replyTo.senderName,
          text: (replyTo.text || '').slice(0, 200),
        },
      }),
    });

    // Update conversation denormalized fields
    const previewText = text.trim().slice(0, 100);
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
    );

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
    const selfIdStr = String(userId);
    const nextMessageCount = conversation.messageCount + 1;
    await forEachParticipant(conversationId, (pid) => {
      const pidStr = pid.toString();
      if (pidStr === selfIdStr) return;

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

    // Advance the sender's read cursor to their own message.
    // When a user sends a message they've obviously read everything up to it.
    // Without this, reopening the conversation would show stale "unread" state.
    markSentMessageRead({
      userId: String(userId),
      conversationId,
      messageCreatedAt: message.createdAt,
    }).catch(() => {/* fire-and-forget */ });

    res.status(201).json({ success: true, message: decorated });
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
      { text: 'This message was deleted', attachments: [], messageType: 'system' as const },
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

    const memberConvIds = await getUserConversationIds(userId);
    if (memberConvIds.length === 0) {
      return res.json({ success: true, counts: {}, lastReadMap: {} });
    }

    // Narrow to conversations still active AND cap to the 200 most recently
    // active. Power users in thousands of chats still get accurate badges on
    // the ones they care about — the long tail is ignored for this endpoint
    // since the MongoDB query planner degrades past ~hundreds of $or clauses.
    const UNREAD_CONV_CAP = 200;
    const activeConvs = await Conversation.find(
      { _id: { $in: memberConvIds }, isActive: true },
      { _id: 1 },
    )
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(UNREAD_CONV_CAP)
      .lean();
    if (activeConvs.length === 0) {
      return res.json({ success: true, counts: {}, lastReadMap: {} });
    }
    const convIds = activeConvs.map((c) => c._id as mongoose.Types.ObjectId);

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
          _id:   '$conversationId',
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
