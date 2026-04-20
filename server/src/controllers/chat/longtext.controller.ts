// ─────────────────────────────────────────────────────────────────────────────
// longtext.controller
//
// HTTP handlers for the three-phase `longtext` message upload:
//
//   POST /api/chat/longtext/start                           — mint uploadId
//   POST /api/chat/longtext/chunk                           — push one chunk
//   POST /api/chat/conversations/:id/messages/longtext      — commit
//   GET  /api/chat/messages/:messageId/chunks/next/:chunkId — lazy fetch
//
// Chunks in flight are idempotent per (uploadId, index). The broadcast socket
// event only fires on successful `complete` so partial / aborted uploads never
// appear in recipients' chats (the TTL index garbage-collects them).
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  Conversation,
  ChatMessage,
} from '../../models/chat.model.js';
import { MessageChunk } from '../../models/messageChunk.model.js';
import { requireAuthUser } from '../../interfaces/auth.interface.js';
import { getErrorMessage } from '../../utils/error.utils.js';
import {
  isParticipant,
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

// ── POST /api/chat/longtext/start ───────────────────────────────────────────
// Body: { text: string (1..1000) }
// Persists the head into a 1-hour TTL session row. The total message length
// is NOT taken from the client — it's computed server-side at `complete`
// time from the actual chunk content lengths, to close a metering bypass
// where a malicious client declares a small number here but uploads huge
// chunks.
export const longtextStart = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const { text } = (req.body ?? {}) as {
      text?: unknown;
    };

    if (typeof text !== 'string' || text.length < 1 || text.length > 1000) {
      return res.status(400).json({ success: false, reason: 'invalid_text', message: 'text must be 1..1000 chars' });
    }

    const result = await startUpload({
      kind:   'user',
      userId: String(user._id),
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

// ── POST /api/chat/longtext/chunk ───────────────────────────────────────────
export const longtextChunk = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
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

    // Session-owner check — the session row must belong to this user.
    const { LongtextUpload } = await import('../../models/longtextUpload.model.js');
    const session = await LongtextUpload.findOne({ uploadId }, { userId: 1 }).lean();
    if (!session) {
      return res.status(400).json({ success: false, reason: 'session_expired' });
    }
    if (!session.userId || String(session.userId) !== String(user._id)) {
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

// ── POST /api/chat/conversations/:id/messages/longtext ──────────────────────
export const longtextComplete = async (req: Request, res: Response) => {
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

    const conversation = await Conversation.findOne({ _id: conversationId, isActive: true });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found or inactive' });
    }
    if (conversation.type === 'system') {
      return res.status(403).json({ success: false, message: 'Cannot reply to system conversations' });
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

    // The head was banked at `start` and TTL'd for 1h. Ownership is enforced
    // here: the session's userId must match the JWT caller. The authoritative
    // total length is computed by `completeUpload` from the persisted chunks —
    // the client never gets to declare it.
    const session = await (await import('../../models/longtextUpload.model.js')).LongtextUpload
      .findOne({ uploadId })
      .lean();
    if (!session) {
      return res.status(400).json({ success: false, reason: 'session_expired' });
    }
    if (!session.userId || String(session.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Normalize replyTo
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

    // Token metering runs against the SERVER-COMPUTED fullLength (head +
    // every chunk's actual content.length), not a client-declared number.
    // `completeUpload` computes the total once chunks are loaded and calls
    // the `meterTokens` callback below; on 402 we've already written the
    // response so the caller must bail without emitting anything else.
    const preview = buildPreviewText({ contentType: 'text', text: session.text });

    type TxTokens = NonNullable<Awaited<ReturnType<typeof guardTokensForLength>>>;
    type TxResult =
      | { ok: true; message: ChatMessageDoc; tokens: TxTokens }
      | { ok: false; status: number; body: Record<string, unknown> };

    const outcome = await withOptionalTransaction<TxResult>(async (rawSession) => {
      const mongoSession = rawSession ?? undefined;
      let tokens: TxTokens | null = null;

      const result = await completeUpload({
        conversationId: conversation._id as mongoose.Types.ObjectId,
        senderId:       userId,
        senderName:     user.name,
        uploadId,
        expectedChunkCount: expectedChunkCount as number,
        ...(parsedReplyTo ? { replyTo: parsedReplyTo } : {}),
        mongoSession,
        meterTokens: async (fullLength) => {
          tokens = await guardTokensForLength(String(userId), fullLength, res, { session: mongoSession });
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

      // `meterTokens` ran (because `result.ok` requires chunks loaded first).
      // If it somehow didn't capture tokens, fall through — this is a
      // programmer-error case, not a user-facing one.
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
            lastMessageSender: user.name,
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

    const chatListNs = getChatListNamespace();
    const selfIdStr = String(userId);
    const nextMessageCount = conversation.messageCount + 1;
    await forEachParticipant(conversation._id.toString(), (pid) => {
      const pidStr = pid.toString();
      if (pidStr === selfIdStr) return;
      emitChatUnreadChanged(chatListNs, pidStr, { conversationId: conversation._id.toString(), count: -1 });
      emitConversationUpdated(chatListNs, pidStr, {
        conversationId:    conversation._id.toString(),
        lastMessageAt:     message.createdAt.toISOString(),
        lastMessageText:   preview,
        lastMessageSender: user.name,
        messageCount:      nextMessageCount,
      });
    });

    markSentMessageRead({
      userId:           String(userId),
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

// ── GET /api/chat/messages/:messageId/chunks/next/:chunkId ──────────────────
export const getMessageChunkNext = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const userId = user._id;
    const { messageId, chunkId } = req.params as { messageId: string; chunkId: string };

    if (!mongoose.isValidObjectId(messageId) || !mongoose.isValidObjectId(chunkId)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const message = await ChatMessage.findById(messageId, { conversationId: 1 }).lean();
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (!(await isParticipant(message.conversationId.toString(), userId))) {
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

// Explicitly reference MessageChunk so lint/imports stay honest if we ever
// need to surface it here directly (e.g. bulk diagnostics endpoint).
void MessageChunk;
