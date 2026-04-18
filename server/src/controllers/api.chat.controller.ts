import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getErrorMessage } from '../utils/error.utils.js';
import { createApiConversation } from '../services/chat/conversationCreator.service.js';
import { signConversation } from '../utils/signature.util.js';
import { env } from '../env.js';
import {
  Conversation,
  ChatMessage,
  ChatReadCursor,
  ConversationParticipant,
} from '../models/chat.model.js';
import { User } from '../models/user.model.js';
import {
  forEachParticipant,
} from '../services/chat/conversationParticipants.service.js';
import { PAGINATION } from '../utils/pagination.js';
import {
  loadLatest,
  loadOlder,
  loadNewer,
  loadAround,
  loadWithAnchor,
} from '../services/chat/chatMessageFetch.service.js';
import {
  markSentMessageRead,
  advanceCursorTo,
} from '../services/chat/chatReadCursor.service.js';
import { recordReads } from '../services/chat/messageRead.service.js';
import { decorateMessages } from './chat/chat.helpers.js';
import {
  getChatMessagesNamespace,
  getChatListNamespace,
} from '../socket/index.js';
import { emitNewMessage, emitMessageDeleted, emitChatReceipts } from '../socket/channels/chat-messages.channel.js';
import { emitChatUnreadChanged, emitConversationUpdated } from '../socket/channels/chat-list.channel.js';

// ── Conversations ────────────────────────────────────────────────────────────

export const createChatConversation = async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const apiKeyUser = req.user;
    if (!apiKeyUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { conversation, existing } = await createApiConversation({
      createdBy: apiKeyUser._id,
      externalUser: { name, email },
    });

    const conversationId = String(conversation._id);
    const ttlMinutes = typeof req.body.expiryMinutes === 'number' ? req.body.expiryMinutes : 5;
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

    const signature = signConversation(conversationId, expiresAt);
    const signedUrl = `${env.FRONTEND_URL}/chat/${conversationId}?signature=${signature}&expiresAt=${expiresAt}`;

    res.status(200).json({
      success: true,
      data: {
        conversation,
        signedUrl,
        expiresAt,
        existing,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

export const getSignedChatConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId, expiryMinutes } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const apiKeyUser = req.user;
    if (!apiKeyUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const ttlMinutes = typeof expiryMinutes === 'number' ? expiryMinutes : 5;
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

    const signature = signConversation(conversationId, expiresAt);
    const signedUrl = `${env.FRONTEND_URL}/chat/${conversationId}?signature=${signature}&expiresAt=${expiresAt}`;

    res.status(200).json({
      success: true,
      data: {
        signedUrl,
        expiresAt,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── Messages (Guest-Facing via Signed URL) ──────────────────────────────────

/**
 * GET /api/chat/conversations/:id
 * Get conversation details for a guest using a signed URL.
 */
export const getGuestConversation = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    const conversationDoc = await Conversation.findById(conversationId).lean();

    if (!conversationDoc || !conversationDoc.isActive) {
      return res.status(404).json({ success: false, message: 'Conversation not found or inactive' });
    }

    // Hydrate the registered "Peer" (the staff/owner on the other side)
    const participants = await ConversationParticipant.find({ conversationId: conversationDoc._id }).lean();
    const peerMember = participants.find(p => p.userId); // Registered user has a userId

    let peer = null;
    if (peerMember) {
      const peerUser = await User.findById(peerMember.userId).select('name username avatar').lean();
      if (peerUser) {
        peer = {
          _id: peerUser._id,
          name: peerUser.name,
          username: peerUser.username,
          avatar: peerUser.avatar,
        };
      }
    }

    res.json({
      success: true,
      conversation: {
        ...conversationDoc,
        peer,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 * Specifically for external guests accessing via signed URL.
 */
export const getGuestMessages = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    const convObjId = new mongoose.Types.ObjectId(conversationId);

    const limit = Math.min(parseInt(req.query.limit as string) || 20, PAGINATION.MAX_LIMIT);
    const before = req.query.before as string | undefined;
    const after = req.query.after as string | undefined;
    const around = req.query.around as string | undefined;
    const anchor = req.query.anchor as string | undefined;

    // Look up the guest's read cursor for this conversation
    const readCursor = await ChatReadCursor.findOne(
      { externalUserName: identity.name, conversationId: convObjId },
      { lastReadMessageId: 1, lastReadAt: 1 },
    ).lean();

    const lastReadMsgId = readCursor?.lastReadMessageId?.toString() ?? null;

    let result;
    if (before) result = await loadOlder(conversationId, before, limit);
    else if (after) result = await loadNewer(conversationId, after, limit);
    else if (around) result = await loadAround(conversationId, around, limit);
    else if (anchor) result = await loadWithAnchor(conversationId, anchor, limit);
    else {
      // Smart initial load for guests
      if (lastReadMsgId) {
        const unreadCount = await ChatMessage.countDocuments({
          conversationId: convObjId,
          senderId: { $ne: null }, // Registered users represent "foreign" messages
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

    if (!result) return res.status(404).json({ success: false, message: 'Messages not found' });

    const decorated = await decorateMessages(
      result.messages,
      conversationId,
      { externalUserName: identity.name },
    );

    // Guest client drives read advancement via POST .../messages/read — we
    // do not auto-upsert on fetch anymore.

    res.json({
      success: true,
      ...result,
      messages: decorated,
      lastReadMessageId: lastReadMsgId,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 * Specifically for external guests accessing via signed URL.
 */
export const sendGuestMessage = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    const { text, replyTo, messageType } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, isActive: true });
    if (!conversation) return res.status(404).json({ success: false, message: 'Inactive conversation' });

    const message = await ChatMessage.create({
      conversationId,
      senderId: null, // Always null for external guests
      senderName: identity.name,
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

    const previewText = text.trim().slice(0, 100);
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessageId: message._id,
          lastMessageAt: message.createdAt,
          lastMessageText: previewText,
          lastMessageSender: identity.name,
        },
        $inc: { messageCount: 1 },
      },
    );

    const decorated = {
      ...message.toObject(),
      isYou: true,
      deliveryStatus: 'sent',
    };

    const chatMsgNs = getChatMessagesNamespace();
    emitNewMessage(chatMsgNs, conversationId, {
      ...message.toObject(),
      deliveryStatus: 'sent',
    });

    const chatListNs = getChatListNamespace();
    const nextMessageCount = conversation.messageCount + 1;
    await forEachParticipant(conversationId, (pid) => {
      const pidStr = pid.toString();
      // External guest doesn't have a user ID, so we broadcast to all REAL participants.
      // (The guest UI uses the direct socket room for updates)
      emitChatUnreadChanged(chatListNs, pidStr, {
        conversationId,
        count: -1,
      });

      emitConversationUpdated(chatListNs, pidStr, {
        conversationId,
        lastMessageAt: message.createdAt.toISOString(),
        lastMessageText: previewText,
        lastMessageSender: identity.name,
        messageCount: nextMessageCount,
      });
    });

    // Advance the guest's read cursor to their own message
    markSentMessageRead({
      externalUserName: identity.name,
      conversationId,
      messageCreatedAt: message.createdAt,
    }).catch(() => { });

    res.status(201).json({ success: true, message: decorated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/public/chat/conversation/:id/messages/read
 *
 * Guest analogue of the internal `markMessagesRead` endpoint. Advances the
 * guest's read cursor (keyed by `externalUserName`) and broadcasts a
 * `receipts_update` so the internal-user sender(s) flip their "sent" ticks
 * to "read".
 *
 * Without this, when an admin sends a message to a guest who's already on
 * the page (message arrives via socket, not HTTP fetch), the guest's
 * cursor never advances and the admin's tick is stuck on "sent".
 */
export const markGuestMessagesRead = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;

    const rawIds = Array.isArray(req.body?.messageIds) ? (req.body.messageIds as unknown[]) : [];
    const messageIds = rawIds
      .filter((x): x is string => typeof x === 'string' && mongoose.isValidObjectId(x))
      .slice(0, 200);

    if (messageIds.length === 0) return res.json({ success: true, markedIds: [] });

    const { insertedIds } = await recordReads({
      conversationId,
      messageIds,
      externalUserName: identity.name,
    });

    if (insertedIds.length === 0) return res.json({ success: true, markedIds: [] });

    const maxMsg = await ChatMessage
      .find({ _id: { $in: insertedIds.map((id) => new mongoose.Types.ObjectId(id)) } }, { createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    if (maxMsg[0]) {
      await advanceCursorTo({
        conversationId,
        externalUserName: identity.name,
        lastReadAt: maxMsg[0].createdAt as Date,
        lastReadMessageId: maxMsg[0]._id as mongoose.Types.ObjectId,
      });
    }

    emitChatReceipts(getChatMessagesNamespace(), conversationId, {
      externalUserName: identity.name,
      messageIds: insertedIds,
      readAt: new Date().toISOString(),
    });

    res.json({ success: true, markedIds: insertedIds });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * DELETE /api/chat/conversations/:id/messages/:messageId
 * Specifically for external guests accessing via signed URL.
 */
export const deleteGuestMessage = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    const messageId = req.params.messageId as string;

    const message = await ChatMessage.findOneAndUpdate(
      { _id: messageId, conversationId, senderId: null, senderName: identity.name },
      { text: 'This message was deleted', attachments: [], messageType: 'system' as const },
      { returnDocument: 'after' },
    );

    if (!message) return res.status(404).json({ success: false, message: 'Message not found or not yours' });

    const chatMsgNs = getChatMessagesNamespace();
    emitMessageDeleted(chatMsgNs, conversationId, messageId);

    res.json({ success: true, message });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};