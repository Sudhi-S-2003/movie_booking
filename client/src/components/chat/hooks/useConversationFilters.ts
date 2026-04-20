import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConversationTypeFilter } from '../../../services/api/chat.api.js';

export type { ConversationTypeFilter };

export type ConversationSortBy    = 'activity' | 'created' | 'name';
export type ConversationSortOrder = 'asc' | 'desc';

/** All filter knobs the conversation list exposes. */
export interface ConversationFiltersState {
  /** Free-text search against conversation title (server-side regex). */
  q:          string;
  /** Conversation type filter; `null` means "all types". */
  type:       ConversationTypeFilter | null;
  /** Client-side filter — hides rows where `unreadCounts[id]` is 0. */
  unreadOnly: boolean;
  /** Which field to sort by (maps to server-side column via adapter). */
  sortBy:     ConversationSortBy;
  /** Ascending or descending. */
  sortOrder:  ConversationSortOrder;
}

const DEFAULT_FILTERS: ConversationFiltersState = {
  q:          '',
  type:       null,
  unreadOnly: false,
  sortBy:     'activity',
  sortOrder:  'desc',
};

/** User-facing label for each filter value — kept near the source of truth. */
export const TYPE_LABELS: Record<ConversationTypeFilter, string> = {
  direct: 'Direct messages',
  group:  'Group chats',
  system: 'System notices',
  api:    'API / Guest links',
};

export const SORT_BY_LABELS: Record<ConversationSortBy, string> = {
  activity: 'Recent activity',
  created:  'Date created',
  name:     'Name',
};

const SORT_ORDER_LABELS: Record<ConversationSortOrder, string> = {
  desc: 'Newest first',
  asc:  'Oldest first',
};

/** For "name" sorting, asc = A→Z / desc = Z→A — relabel accordingly. */
export const getSortOrderLabel = (
  by:    ConversationSortBy,
  order: ConversationSortOrder,
): string => {
  if (by === 'name') return order === 'asc' ? 'A → Z' : 'Z → A';
  return SORT_ORDER_LABELS[order];
};

interface UseConversationFiltersOptions {
  /** Debounce (ms) applied to `q` before it feeds `debouncedFilters`. */
  debounceMs?: number;
}

/**
 * State machine for the conversation list filter bar.
 *
 * Exposes two snapshots:
 *   • `filters`          — live, bound directly to inputs.
 *   • `debouncedFilters` — settles ~`debounceMs` after the last typing change.
 *     Feed THIS into any network-hitting hook (e.g. `useConversations`).
 *
 * Only `q` is debounced; every other control flips `debouncedFilters`
 * synchronously so refetches feel immediate.
 */
export const useConversationFilters = (
  opts: UseConversationFiltersOptions = {},
) => {
  const { debounceMs = 300 } = opts;

  const [filters, setFilters] = useState<ConversationFiltersState>(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<ConversationFiltersState>(DEFAULT_FILTERS);

  // Debounce only the `q` text field.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [filters, debounceMs]);

  const setQ = useCallback((q: string) => {
    setFilters((f) => ({ ...f, q }));
  }, []);

  const setType = useCallback((type: ConversationTypeFilter | null) => {
    setFilters((f) => ({ ...f, type }));
    setDebouncedFilters((f) => ({ ...f, type }));
  }, []);

  const setUnreadOnly = useCallback((unreadOnly: boolean) => {
    setFilters((f) => ({ ...f, unreadOnly }));
    setDebouncedFilters((f) => ({ ...f, unreadOnly }));
  }, []);

  const setSortBy = useCallback((sortBy: ConversationSortBy) => {
    setFilters((f) => ({ ...f, sortBy }));
    setDebouncedFilters((f) => ({ ...f, sortBy }));
  }, []);

  const setSortOrder = useCallback((sortOrder: ConversationSortOrder) => {
    setFilters((f) => ({ ...f, sortOrder }));
    setDebouncedFilters((f) => ({ ...f, sortOrder }));
  }, []);

  const reset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedFilters(DEFAULT_FILTERS);
  }, []);

  const isDirty = useMemo(
    () =>
      filters.q !== DEFAULT_FILTERS.q ||
      filters.type !== DEFAULT_FILTERS.type ||
      filters.unreadOnly !== DEFAULT_FILTERS.unreadOnly ||
      filters.sortBy !== DEFAULT_FILTERS.sortBy ||
      filters.sortOrder !== DEFAULT_FILTERS.sortOrder,
    [filters],
  );

  return {
    filters,
    debouncedFilters,
    setQ,
    setType,
    setUnreadOnly,
    setSortBy,
    setSortOrder,
    reset,
    isDirty,
  };
};
