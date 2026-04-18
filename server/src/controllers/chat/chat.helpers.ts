// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers used by multiple chat HTTP handlers.
//
// Extracted from `chat.controller.ts` so each helper is testable in isolation
// and has a single public surface. The handlers themselves stay thin —
// validation + call to one helper + respond.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import type { ChatMessageDoc } from '../../models/chat.model.js';
import { getChatListNamespace } from '../../socket/index.js';
import { emitNewConversation } from '../../socket/channels/chat-list.channel.js';
import { getReadStatusForMessages } from '../../services/chat/messageRead.service.js';

/** Lean representation of a `ChatMessageDoc` after `.lean()`. */
export type LeanChatMessage = mongoose.FlattenMaps<ChatMessageDoc> & {
  _id: mongoose.Types.ObjectId;
};

export type DeliveryStatus = 'sent' | 'read';

export interface DecoratedChatMessage extends LeanChatMessage {
  isYou:          boolean;
  deliveryStatus?: DeliveryStatus;
}

export interface ViewerIdentity {
  userId?:           string;
  externalUserName?: string;
}

/**
 * Decorate a page of messages with `isYou` and (for own messages)
 * `deliveryStatus`. Delivery status is sourced per-message from
 * `MessageRead` — a message is 'read' iff any OTHER reader has a
 * MessageRead record for it.
 *
 * Non-own messages get no `deliveryStatus` (undefined).
 */
export const decorateMessages = async (
  messages: LeanChatMessage[],
  _conversationId: string,
  viewer: ViewerIdentity,
): Promise<DecoratedChatMessage[]> => {
  if (messages.length === 0) return [];

  const isOwnMessage = (m: LeanChatMessage): boolean => {
    if (viewer.userId) return m.senderId?.toString() === viewer.userId;
    if (viewer.externalUserName) return !m.senderId && m.senderName === viewer.externalUserName;
    return false;
  };

  const ownIds = messages.filter(isOwnMessage).map((m) => m._id);
  const statusMap = ownIds.length > 0
    ? await getReadStatusForMessages(ownIds, viewer)
    : new Map<string, 'sent' | 'read'>();

  return messages.map((m) => {
    const isYou = isOwnMessage(m);
    if (isYou) {
      const status = statusMap.get(m._id.toString()) ?? 'sent';
      return { ...m, isYou, deliveryStatus: status };
    }
    return { ...m, isYou };
  });
};

/**
 * Emit `new_conversation` to every participant except the creator (who
 * already has the conversation via the HTTP response that just returned).
 *
 * The payload is passed through as-is; callers own its shape.
 */
export const broadcastNewConversation = (
  participantIds: ReadonlyArray<string>,
  creatorIdStr:   string,
  payload:        object,
): void => {
  const chatListNs = getChatListNamespace();
  for (const pid of participantIds) {
    if (pid === creatorIdStr) continue;
    emitNewConversation(chatListNs, pid, payload as never);
  }
};
