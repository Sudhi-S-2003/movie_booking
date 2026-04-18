import { useCallback, useEffect, useState } from 'react';
import { apiKeysApi } from '../../../services/api/index.js';
import type { ApiKeyCategory, ApiKeyRecord } from '../../../services/api/apiKeys.api.js';
import type { Pagination } from '../../../types/api.js';
import { ApiError } from '../../../services/api/http.js';

export interface CreatedKey {
  key:    ApiKeyRecord;
  secret: string;
}

export interface UseApiKeysResult {
  keys:        ApiKeyRecord[];
  pagination:  Pagination;
  page:        number;
  loading:     boolean;
  error:       string | null;
  /** Set to the freshly minted key + secret right after `create()`. */
  lastCreated: CreatedKey | null;
  clearLastCreated: () => void;
  goToPage:    (next: number) => void;
  reload:      () => Promise<void>;
  create:      (body: { name: string; category: ApiKeyCategory }) => Promise<CreatedKey | null>;
  revoke:      (id: string) => Promise<void>;
}

const DEFAULT: Pagination = { total: 0, page: 1, limit: 15, totalPages: 1 };

/** Paginated API key list + mutations. */
export const useApiKeys = (limit = 15): UseApiKeysResult => {
  const [keys,         setKeys]         = useState<ApiKeyRecord[]>([]);
  const [pagination,   setPagination]   = useState<Pagination>({ ...DEFAULT, limit });
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [lastCreated,  setLastCreated]  = useState<CreatedKey | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiKeysApi.list({ page: nextPage, limit });
      setKeys(res.keys);
      setPagination(res.pagination);
      setPage(res.pagination.page);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void load(1); }, [load]);

  const goToPage = useCallback((next: number) => {
    if (next < 1 || next > pagination.totalPages || next === page || loading) return;
    void load(next);
  }, [pagination.totalPages, page, loading, load]);

  const reload = useCallback(() => load(page), [load, page]);

  const create = useCallback(async (body: { name: string; category: ApiKeyCategory }) => {
    try {
      const res = await apiKeysApi.create(body);
      setLastCreated(res);
      await load(1);
      return res;
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to create API key');
      return null;
    }
  }, [load]);

  const revoke = useCallback(async (id: string) => {
    try {
      await apiKeysApi.revoke(id);
      await load(page);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to revoke API key');
    }
  }, [load, page]);

  return {
    keys, pagination, page, loading, error,
    lastCreated,
    clearLastCreated: () => setLastCreated(null),
    goToPage, reload, create, revoke,
  };
};
