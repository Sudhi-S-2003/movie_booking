import { http } from './http.js';
import type { SearchResponse } from '../../types/api.js';

export const searchApi = {
  unified: (query: string) =>
    http.get<SearchResponse>('/search', { params: { q: query } }),
};
