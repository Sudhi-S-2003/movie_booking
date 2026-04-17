import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import { chatListSocket } from '../../../services/socket/chat/index.js';
import { CONVERSATIONS_PAGE_SIZE } from '../constants.js';
import type { Conversation } from '../types.js';

/**
 * Manages the conversation list with real-time updates.
 * Connects to the chat-list socket for live conversation/unread events.
 *
 * Uses ref-counted connect/disconnect so shared singleton socket stays
 * alive when multiple hooks use it (e.g. useUnreadCounts).
 */
export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  const fetchConversations = useCallback(async (p: number, append = false) => {
    try {
      setLoading(true);
      const { conversations: items, pagination } = await chatApi.getConversations({
        page:  p,
        limit: CONVERSATIONS_PAGE_SIZE,
      });
      setConversations((prev) => append ? [...prev, ...items] : items);
      setPage(pagination.page);
      setHasMore(pagination.page < pagination.totalPages);
    } catch (e) {
      console.error('[useConversations] fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    void fetchConversations(page + 1, true);
  }, [loading, hasMore, page, fetchConversations]);

  // Initial load
  useEffect(() => {
    void fetchConversations(1);
  }, [fetchConversations]);

  // Socket: live updates + reconnect refetch
  useEffect(() => {
    if (!userId) return;

    // Connect — server auto-joins the user's room from the JWT token
    chatListSocket.connect();

    const unsubs = [
      chatListSocket.on('conversation_updated', (payload: any) => {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c._id === payload.conversationId);
          if (idx === -1) return prev;
          const updated = { ...prev[idx]!, ...payload };
          // Move to top
          const out = prev.filter((_, i) => i !== idx);
          return [updated, ...out];
        });
      }),
      chatListSocket.on('new_conversation', (conv: Conversation) => {
        setConversations((prev) => {
          if (prev.some((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
      }),
      // On reconnect: refetch entire list to catch anything missed while disconnected
      chatListSocket.onReconnect(() => {
        void fetchConversations(1);
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      chatListSocket.disconnect(); // ref-counted — won't kill if others still connected
    };
  }, [userId, fetchConversations]);

  return {
    conversations,
    setConversations,
    loading,
    hasMore,
    loadMore,
    refresh: () => fetchConversations(1),
  };
};
