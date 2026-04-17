import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { ConversationMember } from '../../../services/api/chat.api.js';
import type { Pagination } from '../../../types/api.js';

export interface ConversationMeta {
  _id:        string;
  type:       'direct' | 'group' | 'system';
  title:      string | null;
  createdBy:  string | null;
  publicName: string | null;
}

export interface UseChatMembersResult {
  members:      ConversationMember[];
  conversation: ConversationMeta | null;
  pagination:   Pagination;
  page:         number;
  loading:      boolean;
  error:        string | null;
  goToPage:     (next: number) => void;
  reload:       (targetPage?: number) => Promise<void>;
}

const DEFAULT_PAGINATION: Pagination = {
  total:      0,
  page:       1,
  limit:      15,
  totalPages: 1,
};

/**
 * Paginated members list for a conversation.
 *
 * Encapsulates the fetch + page state + guard against out-of-range jumps.
 * Components call `goToPage(n)` for navigation and `reload()` after
 * mutations (add/remove) to refresh the current page.
 */
export const useChatMembers = (
  conversationId: string,
  limit: number,
): UseChatMembersResult => {
  const [members,      setMembers]      = useState<ConversationMember[]>([]);
  const [conversation, setConversation] = useState<ConversationMeta | null>(null);
  const [pagination,   setPagination]   = useState<Pagination>({ ...DEFAULT_PAGINATION, limit });
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chatApi.getMembers(conversationId, { page: nextPage, limit });
      setMembers(res.members);
      setPagination(res.pagination);
      setConversation(res.conversation);
      setPage(res.pagination.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [conversationId, limit]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const goToPage = useCallback((next: number) => {
    if (next < 1 || next > pagination.totalPages || next === page || loading) return;
    void load(next);
  }, [pagination.totalPages, page, loading, load]);

  const reload = useCallback(async (targetPage?: number) => {
    await load(targetPage ?? page);
  }, [load, page]);

  return { members, conversation, pagination, page, loading, error, goToPage, reload };
};
