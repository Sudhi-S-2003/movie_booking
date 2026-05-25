import { http } from './http.js';
import type { Pagination } from '../../types/api.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApiKeyCategory = 'chat' | 'code-share' | 'code-share-v2';

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

export const CATEGORY_LABELS: Record<string, string> = {
  chat: 'Chat',
  'code-share': 'Code Share (V1)',
  'code-share-v2': 'Code Share (V2)',
  api: 'API',
};

export const apiKeysApi = {
  list: (params?: { page?: number; limit?: number }) =>
    http.get<ListResponse>('/keys', { params }),

  create: (body: CreateBody) =>
    http.post<CreateResponse>('/keys', body),

  revoke: (id: string) =>
    http.delete<{ key: ApiKeyRecord }>(`/keys/${id}`),
};
