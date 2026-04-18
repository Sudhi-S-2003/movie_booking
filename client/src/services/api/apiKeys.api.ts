import { http } from './http.js';
import type { Pagination } from '../../types/api.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApiKeyCategory = 'chat';

export interface ApiKeyRecord {
  _id:        string;
  name:       string;
  category:   ApiKeyCategory;
  keyId:      string;
  createdAt:  string;
  lastUsedAt: string | null;
  revokedAt:  string | null;
}

interface ListResponse {
  keys:       ApiKeyRecord[];
  pagination: Pagination;
}

interface CreateResponse {
  key:    ApiKeyRecord;
  /** The raw secret — shown exactly once by the server. */
  secret: string;
}

interface CreateBody {
  name:      string;
  category?: ApiKeyCategory;
}

// ── Client ────────────────────────────────────────────────────────────────────

export const apiKeysApi = {
  list: (params?: { page?: number; limit?: number }) =>
    http.get<ListResponse>('/keys', { params }),

  create: (body: CreateBody) =>
    http.post<CreateResponse>('/keys', body),

  revoke: (id: string) =>
    http.delete<{ key: ApiKeyRecord }>(`/keys/${id}`),
};
