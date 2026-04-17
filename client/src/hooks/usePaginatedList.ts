import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pagination } from '../services/api/hashtags.api.js';
import { PAGE_SIZE } from '../constants/pagination.js';

export interface PagedFetcherArgs {
  page:  number;
  limit: number;
}

export interface PagedResult<T> {
  items:      T[];
  pagination: Pagination;
}

export type PagedFetcher<T> = (args: PagedFetcherArgs) => Promise<PagedResult<T>>;

interface Options {
  limit?:    number;
  autoLoad?: boolean;
}

/**
 * Shared paginated-list state machine used by profile tabs, hashtag feeds,
 * and any other "load more as you scroll" surface. Handles the awkward bits:
 * - dedupe concurrent fetches
 * - append (not replace) on load-more
 * - derive `hasMore` from the server envelope, not a client guess
 * - `reset()` clears everything when the query changes
 */
export const usePaginatedList = <T,>(
  fetcher: PagedFetcher<T>,
  deps: ReadonlyArray<unknown> = [],
  { limit = PAGE_SIZE.DEFAULT, autoLoad = true }: Options = {},
) => {
  const [items, setItems] = useState<T[]>([]);
  const [page,  setPage]  = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const inflight = useRef(false);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (inflight.current) return;
      inflight.current = true;
      setLoading(true);
      setError(null);
      try {
        const { items: rows, pagination } = await fetcher({ page: nextPage, limit });
        setItems((prev) => (replace ? rows : [...prev, ...rows]));
        setPage(pagination.page);
        setTotal(pagination.total);
        setTotalPages(pagination.totalPages);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
        inflight.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, limit],
  );

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
    setTotalPages(0);
  }, []);

  const loadMore = useCallback(() => {
    if (loading || page >= totalPages) return;
    void loadPage(page + 1, false);
  }, [loadPage, loading, page, totalPages]);

  const refresh = useCallback(() => {
    reset();
    void loadPage(1, true);
  }, [loadPage, reset]);

  useEffect(() => {
    if (!autoLoad) return;
    reset();
    void loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    items,
    page,
    total,
    totalPages,
    loading,
    error,
    hasMore: page < totalPages,
    loadMore,
    refresh,
    setItems,
  };
};
