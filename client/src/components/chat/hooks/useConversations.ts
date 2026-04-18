import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type {
  ConversationTypeFilter,
  ConversationSortField,
  ConversationSortOrder,
} from '../../../services/api/chat.api.js';
import { chatListSocket } from '../../../services/socket/chat/index.js';
import { CONVERSATIONS_PAGE_SIZE } from '../constants.js';
import type { Conversation } from '../types.js';

/** Subset of filter state that hits the server. */
export interface ServerFilters {
  q:         string;
  type:      ConversationTypeFilter | null;
  sortBy:    ConversationSortField;
  sortOrder: ConversationSortOrder;
}

const EMPTY_FILTERS: ServerFilters = {
  q:         '',
  type:      null,
  sortBy:    'activity',
  sortOrder: 'desc',
};

/**
 * Manages the conversation list with real-time updates + server-side filters.
 *
 * Whenever `filters` change identity, the list resets to page 1 with the new
 * query. Pagination (`loadMore`) continues from whatever the current filter is.
 */
export const useConversations = (
  userId:  string | undefined,
  filters: ServerFilters = EMPTY_FILTERS,
) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  // Track the filters used for the last in-flight request so late responses
  // don't clobber the list when filters have moved on.
  const lastRequestedFiltersRef = useRef<ServerFilters>(filters);
  lastRequestedFiltersRef.current = filters;

  const fetchConversations = useCallback(
    async (p: number, append: boolean, f: ServerFilters) => {
      try {
        setLoading(true);
        const { conversations: items, pagination } = await chatApi.getConversations({
          page:      p,
          limit:     CONVERSATIONS_PAGE_SIZE,
          sortBy:    f.sortBy,
          sortOrder: f.sortOrder,
          ...(f.q    ? { q: f.q }       : {}),
          ...(f.type ? { type: f.type } : {}),
        });

        // Drop stale response if filters changed between request and reply.
        const latest = lastRequestedFiltersRef.current;
        if (
          latest.q         !== f.q         ||
          latest.type      !== f.type      ||
          latest.sortBy    !== f.sortBy    ||
          latest.sortOrder !== f.sortOrder
        ) return;

        setConversations((prev) => append ? [...prev, ...items] : items);
        setPage(pagination.page);
        setHasMore(pagination.page < pagination.totalPages);
      } catch (e) {
        console.error('[useConversations] fetch failed:', e);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    void fetchConversations(page + 1, true, lastRequestedFiltersRef.current);
  }, [loading, hasMore, page, fetchConversations]);

  // Reload whenever user or filters change.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setConversations([]);
      setHasMore(false);
      return;
    }
    void fetchConversations(1, false, filters);
  }, [userId, filters.q, filters.type, filters.sortBy, filters.sortOrder, fetchConversations]);

  // Socket: live updates + reconnect refetch
  useEffect(() => {
    if (!userId) return;

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
      chatListSocket.onReconnect(() => {
        void fetchConversations(1, false, lastRequestedFiltersRef.current);
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      chatListSocket.disconnect();
    };
  }, [userId, fetchConversations]);

  return {
    conversations,
    setConversations,
    loading,
    hasMore,
    loadMore,
    refresh: () => fetchConversations(1, false, lastRequestedFiltersRef.current),
  };
};
