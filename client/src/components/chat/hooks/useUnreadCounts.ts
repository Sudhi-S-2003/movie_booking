import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import { chatListSocket } from '../../../services/socket/chat/index.js';

/**
 * Manages unread message counts for all conversations.
 * Subscribes to the chat-list socket for real-time badge updates.
 *
 * Uses ref-counted connect/disconnect so shared singleton socket stays
 * alive when multiple hooks use it (e.g. useConversations).
 *
 * Exposes `countsReady` so the orchestrator (ChatContext) can wait for
 * the initial fetch before attempting anchor-based message loading.
 */
export const useChatUnreadCounts = (userId: string | undefined) => {
  const [counts, setCounts]           = useState<Record<string, number>>({});
  const [lastReadMap, setLastReadMap] = useState<Record<string, string | null>>({});
  const [countsReady, setCountsReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const data = await chatApi.getUnreadCounts();
      setCounts(data.counts);
      setLastReadMap(data.lastReadMap);
      setCountsReady(true);
    } catch (e) {
      console.error('[useChatUnreadCounts] fetch failed:', e);
      // Even on error, mark ready so we don't block forever
      setCountsReady(true);
    }
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchCounts(), 300);
  }, [fetchCounts]);

  const clearConversation = useCallback((conversationId: string) => {
    setCounts((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  // Total unread across all conversations
  const totalUnread = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    void fetchCounts();
  }, [userId, fetchCounts]);

  // Socket: live unread updates + reconnect refetch
  useEffect(() => {
    if (!userId) return;

    // Connect — ref-counted, safe to call from multiple hooks
    chatListSocket.connect();

    const unsubs = [
      chatListSocket.on('unread_changed', (payload: any) => {
        // Delta-style hint (count: -1) means "something changed, refetch".
        // This avoids N+1 per-participant unread queries on the server.
        if (payload.count < 0) {
          debouncedRefresh();
          return;
        }
        setCounts((prev) => ({
          ...prev,
          [payload.conversationId]: payload.count,
        }));
        if (payload.lastReadMessageId !== undefined) {
          setLastReadMap((prev) => ({
            ...prev,
            [payload.conversationId]: payload.lastReadMessageId,
          }));
        }
      }),
      // On reconnect: refetch to sync counts missed during disconnect
      chatListSocket.onReconnect(() => {
        void fetchCounts();
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      chatListSocket.disconnect(); // ref-counted
    };
  }, [userId, fetchCounts, debouncedRefresh]);

  return {
    counts,
    lastReadMap,
    countsReady,
    totalUnread,
    refresh:           debouncedRefresh,
    clearConversation,
  };
};
