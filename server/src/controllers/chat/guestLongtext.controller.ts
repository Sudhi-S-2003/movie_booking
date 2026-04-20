// ─────────────────────────────────────────────────────────────────────────────
// guestLongtext.controller
//
// Signature-authenticated (external / guest) mirror of
// `chat/longtext.controller.ts`. Handles the three-phase chunked upload for
// messages > 1000 chars sent from a signed-URL chat page, plus the lazy
// "next chunk" fetch used by <LongTextBubble>.
//
// Differences from the internal flow:
//   • Caller identity comes from `req.externalUser` (populated by
//     `isChatSignatureValid`), not `req.user`.
//   • The upload session is keyed by `externalUserName` + `conversationId`
//     (so a guest can't reach across conversations).
//   • Token metering debits the **conversation's API-key owner**
//     (`conversation.createdBy`) — mirrors `sendGuestMessage`.
//   • The created ChatMessage has `senderId: null`, `senderName: identity.name`.
//   • The read cursor advance uses `externalUserName`.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  Conversation,
  ChatMessage,
} from '../../models/chat.model.js';
import { LongtextUpload } from '../../models/longtextUpload.model.js';
import { getErrorMessage } from '../../utils/error.utils.js';
import {
  forEachParticipant,
} from '../../services/chat/conversationParticipants.service.js';
import {
  startUpload,
  saveChunk,
  completeUpload,
  loadChunk,
} from '../../services/chat/longtext.service.js';
import { guardTokensForLength } from '../../services/subscription/tokenGuard.js';
import { markSentMessageRead } from '../../services/chat/chatReadCursor.service.js';
import {
  getChatMessagesNamespace,
  getChatListNamespace,
} from '../../socket/index.js';
import { emitNewMessage } from '../../socket/channels/chat-messages.channel.js';
import {
  emitChatUnreadChanged,
  emitConversationUpdated,
} from '../../socket/channels/chat-list.channel.js';
import { buildPreviewText } from '../../services/chat/contentTypeValidator.js';
import { withOptionalTransaction, withSession } from '../../utils/transaction.util.js';
import type { ChatMessageDoc } from '../../models/chat.model.js';

// ── POST /api/public/chat/conversation/:id/longtext/start ───────────────────
export const guestLongtextStart = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation id' });
    }

    const { text } = (req.body ?? {}) as {
      text?: unknown;
    };

    if (typeof text !== 'string' || text.length < 1 || text.length > 1000) {
      return res.status(400).json({ success: false, reason: 'invalid_text', message: 'text must be 1..1000 chars' });
    }

    const result = await startUpload({
      kind:             'guest',
      externalUserName: identity.name,
      conversationId,
      text,
    });
    if (!result.ok) {
      return res.status(400).json({ success: false, reason: result.error.kind });
    }
    res.json({ success: true, uploadId: result.uploadId });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── POST /api/public/chat/conversation/:id/longtext/chunk ───────────────────
export const guestLongtextChunk = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    const { uploadId, index, content } = req.body ?? {};
    if (typeof uploadId !== 'string' || !uploadId) {
      return res.status(400).json({ success: false, message: 'uploadId required' });
    }
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: 'index must be a non-negative integer' });
    }
    if (typeof content !== 'string' || content.length === 0 || content.length > 10_000) {
      return res.status(400).json({ success: false, message: 'content must be 1..10000 chars' });
    }

    // Session-owner check — must match the caller's guest identity AND the
    // conversation the signed URL is scoped to (defense-in-depth: a signature
    // for conv A must never reach an upload that was opened against conv B).
    const session = await LongtextUpload.findOne(
      { uploadId },
      { externalUserName: 1, conversationId: 1 },
    ).lean();
    if (!session) {
      return res.status(400).json({ success: false, reason: 'session_expired' });
    }
    if (
      !session.externalUserName ||
      session.externalUserName !== identity.name ||
      String(session.conversationId) !== String(conversationId)
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
      await saveChunk({ uploadId, index, content });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'too_many_chunks') {
        return res.status(400).json({ success: false, reason: 'too_many_chunks' });
      }
      throw err;
    }
    res.json({ success: true, ok: true });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── POST /api/public/chat/conversation/:id/longtext/complete ────────────────
export const guestLongtextComplete = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation id' });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, isActive: true });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or inactive' });
    }
    if (conversation.type === 'system') {
      return res.status(403).json({ success: false, message: 'Cannot reply to system conversations' });
    }

    // Guest sends are metered against the API-key owner (mirrors sendGuestMessage).
    if (!conversation.createdBy) {
      return res.status(400).json({ success: false, message: 'Conversation has no owner to bill' });
    }

    const {
      uploadId,
      expectedChunkCount,
      replyTo,
    } = (req.body ?? {}) as {
      uploadId?:           unknown;
      expectedChunkCount?: unknown;
      replyTo?:            unknown;
    };

    if (typeof uploadId !== 'string' || !uploadId) {
      return res.status(400).json({ success: false, message: 'uploadId required' });
    }
    if (!Number.isInteger(expectedChunkCount) || (expectedChunkCount as number) < 1) {
      return res.status(400).json({ success: false, message: 'expectedChunkCount must be >= 1' });
    }

    // Pull the session row (banked at `start`, TTL 1h). Enforce identity +
    // conversation scope here.
    const session = await LongtextUpload.findOne({ uploadId }).lean();
    if (!session) {
      return res.status(400).json({ success: false, reason: 'session_expired' });
    }
    if (
      !session.externalUserName ||
      session.externalUserName !== identity.name ||
      String(session.conversationId) !== String(conversationId)
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Normalize replyTo (same shape as the internal flow).
    let parsedReplyTo: { messageId: string; senderName: string; text: string } | undefined;
    if (replyTo && typeof replyTo === 'object') {
      const r = replyTo as Record<string, unknown>;
      if (typeof r.messageId === 'string' && typeof r.senderName === 'string') {
        parsedReplyTo = {
          messageId:  r.messageId,
          senderName: r.senderName,
          text:       typeof r.text === 'string' ? r.text.slice(0, 200) : '',
        };
      }
    }

    // Token metering runs against the SERVER-COMPUTED fullLength — charged
    // to the API-key owner. The client-declared length is ignored; we sum
    // the actual chunk content lengths inside `completeUpload` and pass the
    // total to the `meterTokens` callback below.
    const preview = buildPreviewText({ contentType: 'text', text: session.text });

    type TxTokens = NonNullable<Awaited<ReturnType<typeof guardTokensForLength>>>;
    type TxResult =
      | { ok: true; message: ChatMessageDoc; tokens: TxTokens }
      | { ok: false; status: number; body: Record<string, unknown> };

    const ownerId = String(conversation.createdBy);

    const outcome = await withOptionalTransaction<TxResult>(async (rawSession) => {
      const mongoSession = rawSession ?? undefined;
      let tokens: TxTokens | null = null;

      const result = await completeUpload({
        conversationId: conversation._id as mongoose.Types.ObjectId,
        senderId:       null, // guests are anonymous
        senderName:     identity.name,
        uploadId,
        expectedChunkCount: expectedChunkCount as number,
        ...(parsedReplyTo ? { replyTo: parsedReplyTo } : {}),
        mongoSession,
        meterTokens: async (fullLength) => {
          tokens = await guardTokensForLength(ownerId, fullLength, res, { session: mongoSession });
          return tokens ? { ok: true } : { ok: false };
        },
      });

      if (!result.ok) {
        if (result.error.kind === 'missing_chunks') {
          return {
            ok: false,
            status: 400,
            body: {
              reason:   'missing_chunks',
              expected: result.error.expected,
              got:      result.error.got,
            },
          };
        }
        if (result.error.kind === 'metering_rejected') {
          // `guardTokensForLength` already wrote the 402 body to `res`.
          return { ok: false, status: 402, body: {} };
        }
        return { ok: false, status: 400, body: { reason: result.error.kind } };
      }

      if (!tokens) {
        return { ok: false, status: 500, body: { message: 'Metering did not run' } };
      }

      const createdMessage = result.message;

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessageId:     createdMessage._id,
            lastMessageAt:     createdMessage.createdAt,
            lastMessageText:   preview,
            lastMessageSender: identity.name,
          },
          $inc: { messageCount: 1 },
        },
        withSession(mongoSession),
      );

      return { ok: true, message: createdMessage, tokens };
    });

    if (!outcome.ok) {
      if (outcome.status === 402) return;
      return res.status(outcome.status).json({ success: false, ...outcome.body });
    }
    const { message, tokens } = outcome;

    const decorated = {
      ...message.toObject(),
      isYou: true,
      deliveryStatus: 'sent' as const,
    };

    const chatMsgNs = getChatMessagesNamespace();
    emitNewMessage(chatMsgNs, conversation._id.toString(), {
      ...message.toObject(),
      deliveryStatus: 'sent',
    });

    // Fan out sidebar updates to REAL participants — the guest itself has no
    // sidebar to hit (same rule `sendGuestMessage` follows).
    const chatListNs = getChatListNamespace();
    const nextMessageCount = conversation.messageCount + 1;
    await forEachParticipant(conversation._id.toString(), (pid) => {
      const pidStr = pid.toString();
      emitChatUnreadChanged(chatListNs, pidStr, {
        conversationId: conversation._id.toString(),
        count: -1,
      });
      emitConversationUpdated(chatListNs, pidStr, {
        conversationId:    conversation._id.toString(),
        lastMessageAt:     message.createdAt.toISOString(),
        lastMessageText:   preview,
        lastMessageSender: identity.name,
        messageCount:      nextMessageCount,
      });
    });

    // Advance the guest's read cursor to their own send.
    markSentMessageRead({
      externalUserName: identity.name,
      conversationId:   conversation._id.toString(),
      messageId:        message._id as mongoose.Types.ObjectId,
      messageCreatedAt: message.createdAt,
    }).catch(() => { /* fire-and-forget */ });

    res.status(201).json({
      success: true,
      message: decorated,
      tokens:  { remaining: tokens.remaining, plan: tokens.plan, cost: tokens.cost },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

// ── GET /api/public/chat/conversation/:id/messages/:messageId/chunks/next/:chunkId ──
export const getGuestMessageChunkNext = async (req: Request, res: Response) => {
  try {
    const identity = req.externalUser;
    if (!identity) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const conversationId = req.params.id as string;
    const { messageId, chunkId } = req.params as { messageId: string; chunkId: string; id: string };

    if (
      !mongoose.isValidObjectId(conversationId) ||
      !mongoose.isValidObjectId(messageId) ||
      !mongoose.isValidObjectId(chunkId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    // Make sure the requested message actually lives in the conversation the
    // signed URL grants access to — otherwise a guest could fetch chunks from
    // any conversation by guessing a message id.
    const message = await ChatMessage.findById(messageId, { conversationId: 1 }).lean();
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (String(message.conversationId) !== String(conversationId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const chunk = await loadChunk(messageId, chunkId);
    if (!chunk) return res.status(403).json({ success: false, message: 'Chunk not found for this message' });

    res.json({
      success: true,
      content:     chunk.content,
      nextChunkId: chunk.nextChunkId ? chunk.nextChunkId.toString() : null,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};
