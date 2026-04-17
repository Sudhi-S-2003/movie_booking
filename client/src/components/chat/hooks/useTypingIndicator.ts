import { useState, useEffect, useRef, useCallback } from 'react';
import { chatMessagesSocket } from '../../../services/socket/chat/index.js';
import { TYPING_TIMEOUT } from '../constants.js';
import type { TypingEvent } from '../types.js';

interface TypingUser {
  userId: string;
  name:   string;
}

/**
 * Tracks which users are currently typing in a conversation.
 * Auto-clears after TYPING_TIMEOUT if no new typing event arrives.
 */
export const useTypingIndicator = (
  conversationId: string | null,
  currentUserId: string | undefined,
) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!conversationId) return;

    const clearUserTimer = (userId: string) => {
      const existing = timersRef.current.get(userId);
      if (existing) clearTimeout(existing);
      timersRef.current.delete(userId);
    };

    const removeUser = (userId: string) => {
      clearUserTimer(userId);
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    const unsubs = [
      chatMessagesSocket.on<TypingEvent>('user_typing', (payload) => {
        if (payload.conversationId !== conversationId) return;
        if (payload.userId === currentUserId) return;

        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === payload.userId)) return prev;
          return [...prev, { userId: payload.userId, name: payload.name }];
        });

        // Auto-clear after timeout
        clearUserTimer(payload.userId);
        timersRef.current.set(
          payload.userId,
          setTimeout(() => removeUser(payload.userId), TYPING_TIMEOUT),
        );
      }),
      chatMessagesSocket.on<{ conversationId: string; userId: string }>(
        'user_stop_typing',
        (payload) => {
          if (payload.conversationId !== conversationId) return;
          removeUser(payload.userId);
        },
      ),
    ];

    return () => {
      unsubs.forEach((u) => u());
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
      setTypingUsers([]);
    };
  }, [conversationId, currentUserId]);

  // Send typing indicator — server identifies user from JWT, no client userId needed
  const sendTyping = useCallback(() => {
    if (!conversationId) return;
    chatMessagesSocket.sendTyping(conversationId);
  }, [conversationId]);

  const sendStopTyping = useCallback(() => {
    if (!conversationId) return;
    chatMessagesSocket.sendStopTyping(conversationId);
  }, [conversationId]);

  return { typingUsers, sendTyping, sendStopTyping };
};
