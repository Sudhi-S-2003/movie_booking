import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { JoinRequestWithUser } from '../../../services/api/chat.api.js';
import type { Pagination } from '../../../types/api.js';
import { ApiError } from '../../../services/api/http.js';

type Status = 'pending' | 'approved' | 'rejected';

export interface UseJoinRequestsState {
  requests:      JoinRequestWithUser[];
  pagination:    Pagination;
  page:          number;
  status:        Status;
  pendingTotal:  number;
  loading:       boolean;
  error:         string | null;
  setStatus:     (status: Status) => void;
  goToPage:      (next: number) => void;
  approve:       (requestId: string) => Promise<void>;
  reject:        (requestId: string) => Promise<void>;
  reload:        () => Promise<void>;
}

const DEFAULT: Pagination = { total: 0, page: 1, limit: 15, totalPages: 1 };

/** Owner-only hook: list + resolve (approve / reject) join requests. */
export const useJoinRequests = (
  conversationId: string,
  limit = 15,
): UseJoinRequestsState => {
  const [requests,     setRequests]     = useState<JoinRequestWithUser[]>([]);
  const [pagination,   setPagination]   = useState<Pagination>({ ...DEFAULT, limit });
  const [page,         setPage]         = useState(1);
  const [status,       setStatus]       = useState<Status>('pending');
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, nextStatus: Status) => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chatApi.listJoinRequests(conversationId, {
        page:  nextPage,
        limit,
        status: nextStatus,
      });
      setRequests(res.requests);
      setPagination(res.pagination);
      setPendingTotal(res.pendingTotal);
      setPage(res.pagination.page);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [conversationId, limit]);

  useEffect(() => { void load(1, status); }, [load, status]);

  const goToPage = useCallback((next: number) => {
    if (next < 1 || next > pagination.totalPages || next === page || loading) return;
    void load(next, status);
  }, [pagination.totalPages, page, loading, load, status]);

  const approve = useCallback(async (requestId: string) => {
    try {
      await chatApi.approveJoinRequest(conversationId, requestId);
      await load(page, status);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to approve request');
    }
  }, [conversationId, load, page, status]);

  const reject = useCallback(async (requestId: string) => {
    try {
      await chatApi.rejectJoinRequest(conversationId, requestId);
      await load(page, status);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to reject request');
    }
  }, [conversationId, load, page, status]);

  const reload = useCallback(() => load(page, status), [load, page, status]);

  return {
    requests, pagination, page, status, pendingTotal,
    loading, error,
    setStatus, goToPage, approve, reject, reload,
  };
};
