import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { ChatInvite } from '../../../services/api/chat.api.js';
import type { Pagination } from '../../../types/api.js';
import { ApiError } from '../../../services/api/http.js';

export interface UseConversationInvitesState {
  invites:    ChatInvite[];
  pagination: Pagination;
  page:       number;
  loading:    boolean;
  error:      string | null;
  goToPage:   (next: number) => void;
  reload:     () => Promise<void>;
  create:     (body?: { expiresInMs?: number; maxUses?: number }) => Promise<ChatInvite | null>;
  revoke:     (inviteId: string) => Promise<void>;
}

const DEFAULT: Pagination = { total: 0, page: 1, limit: 10, totalPages: 1 };

/** Owner-only invite management — fetch, create, and revoke invite links. */
export const useConversationInvites = (
  conversationId: string,
  limit = 10,
): UseConversationInvitesState => {
  const [invites,    setInvites]    = useState<ChatInvite[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ ...DEFAULT, limit });
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chatApi.listInvites(conversationId, { page: nextPage, limit });
      setInvites(res.invites);
      setPagination(res.pagination);
      setPage(res.pagination.page);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [conversationId, limit]);

  useEffect(() => { void load(1); }, [load]);

  const goToPage = useCallback((next: number) => {
    if (next < 1 || next > pagination.totalPages || next === page || loading) return;
    void load(next);
  }, [pagination.totalPages, page, loading, load]);

  const reload = useCallback(() => load(page), [load, page]);

  const create = useCallback(async (body?: { expiresInMs?: number; maxUses?: number }) => {
    try {
      const { invite } = await chatApi.createInvite(conversationId, body);
      await load(1);
      return invite;
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to create invite');
      return null;
    }
  }, [conversationId, load]);

  const revoke = useCallback(async (inviteId: string) => {
    try {
      await chatApi.revokeInvite(conversationId, inviteId);
      await load(page);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to revoke invite');
    }
  }, [conversationId, load, page]);

  return { invites, pagination, page, loading, error, goToPage, reload, create, revoke };
};
