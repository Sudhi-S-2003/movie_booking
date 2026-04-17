import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { SearchedUser } from '../../chat/types.js';

export interface UseUserSearchOptions {
  /** Results per page — defaults to 10. */
  limit?: number;
  /** Debounce window in ms — defaults to 300. */
  debounceMs?: number;
}

export interface UseUserSearchResult {
  query:       string;
  results:     SearchedUser[];
  searching:   boolean;
  page:        number;
  totalPages:  number;
  total:       number;
  setQuery:    (q: string) => void;
  goToPage:    (next: number) => void;
  reset:       () => void;
}

/**
 * Paginated debounced user search, built for the Add Members modal.
 *
 * Guarantees that stale responses never overwrite fresher ones: each
 * fetch increments a monotonic sequence counter and discards its own
 * result if a newer request has started in the meantime.
 *
 * Callers drive the query via `setQuery` (debounces + resets to page 1)
 * and paginate via `goToPage`. `reset` clears all state — used on modal
 * open.
 */
export const useUserSearch = ({
  limit = 10,
  debounceMs = 300,
}: UseUserSearchOptions = {}): UseUserSearchResult => {
  const [query,      setQueryState] = useState('');
  const [results,    setResults]    = useState<SearchedUser[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef      = useRef(0);

  const clearResults = useCallback(() => {
    setResults([]);
    setPage(1);
    setTotalPages(1);
    setTotal(0);
  }, []);

  const run = useCallback(async (q: string, pageNum: number) => {
    if (!q.trim()) {
      clearResults();
      return;
    }
    const seq = ++seqRef.current;
    setSearching(true);
    try {
      const { users, pagination } = await chatApi.searchUsers(q.trim(), { page: pageNum, limit });
      if (seq !== seqRef.current) return; // stale
      setResults(users);
      setPage(pagination.page);
      setTotalPages(pagination.totalPages);
      setTotal(pagination.total);
    } catch {
      if (seq !== seqRef.current) return;
      clearResults();
    } finally {
      if (seq === seqRef.current) setSearching(false);
    }
  }, [clearResults, limit]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      clearResults();
      return;
    }
    debounceRef.current = setTimeout(() => void run(q, 1), debounceMs);
  }, [clearResults, debounceMs, run]);

  const goToPage = useCallback((next: number) => {
    if (searching || next < 1 || next > totalPages || next === page) return;
    void run(query, next);
  }, [searching, totalPages, page, run, query]);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQueryState('');
    clearResults();
  }, [clearResults]);

  // Clean up pending debounce on unmount.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { query, results, searching, page, totalPages, total, setQuery, goToPage, reset };
};
