// ─────────────────────────────────────────────────────────────────────────────
// systemMessage.service
//
// Creates system notification conversations and messages. Called internally
// by workers and other services — NOT an HTTP handler.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import { Conversation, ChatMessage, ConversationParticipant } from '../../models/chat.model.js';
import { ensureSystemUser } from '../../utils/systemUser.js';
import { syncParticipants } from './conversationParticipants.service.js';
import { generateAutoPublicName } from '../../utils/publicName.util.js';
import {
  getChatListNamespace,
} from '../../socket/index.js';
import {
  emitChatUnreadChanged,
  emitConversationUpdated,
} from '../../socket/channels/chat-list.channel.js';

/**
 * Create a system notification conversation for a user.
 *
 * Messages come from the internal CinemaConnect system user account
 * (auto-created on first use via ensureSystemUser).
 */
export const createSystemMessage = async (
  recipientId: string,
  title: string,
  text: string,
) => {
  try {
    const systemUser = await ensureSystemUser();
    const recipientObjId = new mongoose.Types.ObjectId(recipientId);

    // Don't send system messages to the system user itself
    if (String(systemUser._id) === recipientId) return null;

    const systemUserId = systemUser._id as mongoose.Types.ObjectId;
    const participantIds = [systemUserId, recipientObjId];

    // Dedup: one system-notification bucket per (recipient, title). Look
    // for a system conversation the recipient already belongs to that
    // carries the same title.
    let conversation = await findExistingSystemBucket(recipientObjId, title);

    if (!conversation) {
      conversation = await createSystemConversation({ title, systemUserId });
      await syncParticipants(
        conversation._id as mongoose.Types.ObjectId,
        participantIds,
        { creatorId: systemUserId },
      );
    }

    const message = await ChatMessage.create({
      conversationId: conversation._id,
      senderId:       systemUser._id,
      senderName:     systemUser.name,
      contentType:    'system',
      text,
      isSystem:       true,
    });

    const previewText = text.slice(0, 100);
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastMessageId:     message._id,
          lastMessageAt:     message.createdAt,
          lastMessageText:   previewText,
          lastMessageSender: systemUser.name,
        },
        $inc: { messageCount: 1 },
      },
    );

    // Notify recipient via socket
    try {
      const chatListNs = getChatListNamespace();
      emitChatUnreadChanged(chatListNs, recipientId, {
        conversationId: String(conversation._id),
        count:          conversation.messageCount + 1,
      });
      emitConversationUpdated(chatListNs, recipientId, {
        conversationId:    String(conversation._id),
        lastMessageAt:     message.createdAt.toISOString(),
        lastMessageText:   previewText,
        lastMessageSender: systemUser.name,
      });
    } catch {
      // Socket may not be initialized yet (seed scripts, tests)
    }

    return { conversation, message };
  } catch (e: unknown) {
    console.error('[systemMessage] create failed:', e);
    return null;
  }
};

// ─── Private helpers ────────────────────────────────────────────────────────

/**
 * Look up an existing system-notification bucket for (recipient, title).
 * Single responsibility: locate, don't create.
 */
const findExistingSystemBucket = async (
  recipientObjId: mongoose.Types.ObjectId,
  title: string,
) => {
  const memberships = await ConversationParticipant.find(
    { userId: recipientObjId },
    { conversationId: 1, _id: 0 },
  ).lean();
  if (memberships.length === 0) return null;

  return Conversation.findOne({
    _id:   { $in: memberships.map((m) => m.conversationId) },
    type:  'system',
    title,
  });
};

/**
 * Create a fresh system conversation. Retries on the astronomically unlikely
 * slug collision since publicName is auto-generated.
 */
const createSystemConversation = async ({
  title,
  systemUserId,
}: {
  title:        string;
  systemUserId: mongoose.Types.ObjectId;
}) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await Conversation.create({
        type:         'system',
        title,
        createdBy:    systemUserId,
        messageCount: 0,
        isActive:     true,
        publicName:   generateAutoPublicName('system', { title }),
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) continue;
      throw err;
    }
  }
  throw new Error('Failed to allocate system conversation slug');
};
