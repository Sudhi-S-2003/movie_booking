import mongoose from 'mongoose';
import { Conversation, ChatMessage } from '../../models/chat.model.js';
import type { ChatMessageDoc } from '../../models/chat.model.js';
import { guardTokens } from '../subscription/tokenGuard.js';
import { withOptionalTransaction, withSession } from '../../utils/transaction.util.js';
import { getChatMessagesNamespace, getChatListNamespace } from '../../socket/index.js';
import { emitNewMessage, emitMessageDeleted } from '../../socket/channels/chat-messages.channel.js';
import { emitChatUnreadChanged, emitConversationUpdated } from '../../socket/channels/chat-list.channel.js';
import { forEachParticipant } from './conversationParticipants.service.js';
import { markSentMessageRead } from './chatReadCursor.service.js';
import { handleChatbotTrigger } from '../chatbot/chatbotTrigger.service.js';

export const saveAndEmitMessage = async (
  conversationId: string,
  userId: any, // string or null for guest
  userName: string,
  normalizedMsg: any,
  previewText: string,
  meterInput: string,
  res: any, // passed to guardTokens
  isGuest: boolean = false,
  billingUserId: string | null = null // used if guest
) => {
  const guardId = isGuest && billingUserId ? billingUserId : String(userId);

  type TxResult =
    | { ok: true; message: ChatMessageDoc; tokens: any }
    | { ok: false; status: number; body: Record<string, unknown> };

  const outcome = await withOptionalTransaction<TxResult>(async (session) => {
    const tokens = await guardTokens(guardId, meterInput, res, { session });
    if (!tokens) return { ok: false, status: 402, body: {} };

    const messageDoc: Record<string, unknown> = {
      conversationId,
      senderId: userId,
      senderName: userName,
      contentType: normalizedMsg.contentType,
      text: normalizedMsg.text,
      attachments: normalizedMsg.attachments,
      isSystem: false,
    };
    if (normalizedMsg.emoji !== undefined) messageDoc.emoji = normalizedMsg.emoji;
    if (normalizedMsg.contact !== undefined) messageDoc.contact = normalizedMsg.contact;
    if (normalizedMsg.location !== undefined) messageDoc.location = normalizedMsg.location;
    if (normalizedMsg.date !== undefined) messageDoc.date = normalizedMsg.date;
    if (normalizedMsg.event !== undefined) messageDoc.event = normalizedMsg.event;
    if (normalizedMsg.replyTo) {
      messageDoc.replyTo = {
        messageId: normalizedMsg.replyTo.messageId,
        senderName: normalizedMsg.replyTo.senderName,
        text: normalizedMsg.replyTo.text,
      };
    }

    const [createdMessage] = await ChatMessage.create([messageDoc], withSession(session));
    const message = createdMessage!;

    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessageId: message._id,
          lastMessageAt: message.createdAt,
          lastMessageText: previewText,
          lastMessageSender: userName,
        },
        $inc: { messageCount: 1 },
      },
      withSession(session)
    );

    return { ok: true, message, tokens };
  });

  return outcome;
};

export const broadcastAndPostProcessMessage = async (
  message: any,
  conversationId: string,
  userName: string,
  previewText: string,
  userId: any,
  isGuest: boolean = false
) => {
  const conversation = await Conversation.findOne({ _id: conversationId, isActive: true });
  if (!conversation) return;

  const chatMsgNs = getChatMessagesNamespace();
  emitNewMessage(chatMsgNs, conversationId, {
    ...message.toObject(),
    deliveryStatus: 'sent',
  });

  const chatListNs = getChatListNamespace();
  const nextMessageCount = conversation.messageCount;

  await forEachParticipant(conversationId, (pid) => {
    const pidStr = pid.toString();
    emitChatUnreadChanged(chatListNs, pidStr, {
      conversationId,
      count: -1,
    });

    emitConversationUpdated(chatListNs, pidStr, {
      conversationId,
      lastMessageAt: message.createdAt.toISOString(),
      lastMessageText: previewText,
      lastMessageSender: userName,
      messageCount: nextMessageCount,
    });
  });

  if (isGuest) {
    markSentMessageRead({
      externalUserName: userName,
      conversationId,
      messageId: message._id,
      messageCreatedAt: message.createdAt,
    }).catch(() => {});
  } else {
    markSentMessageRead({
      userId: String(userId),
      conversationId,
      messageId: message._id,
      messageCreatedAt: message.createdAt,
    }).catch(() => {});
  }

  handleChatbotTrigger(conversationId, message.text || '', userId ? String(userId) : null, userName).catch((err) => {
    console.error('Chatbot trigger error:', err);
  });
};

export const performDeleteMessage = async (
  messageId: string,
  conversationId: string,
  userId: any,
  userName: string,
  isGuest: boolean = false
) => {
  const query = isGuest
    ? { _id: messageId, conversationId, senderId: null, senderName: userName }
    : { _id: messageId, conversationId, senderId: userId };

  const message = await ChatMessage.findOneAndUpdate(
    query,
    { text: 'This message was deleted', attachments: [], contentType: 'system' as const },
    { returnDocument: 'after' }
  );

  if (message) {
    const chatMsgNs = getChatMessagesNamespace();
    emitMessageDeleted(chatMsgNs, conversationId, messageId);
  }

  return message;
};
