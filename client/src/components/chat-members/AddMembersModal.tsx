import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, UserPlus, X } from 'lucide-react';
import { ChatAvatar } from '../chat/ui/ChatAvatar.js';
import { chatApi } from '../../services/api/chat.api.js';
import { fetchAllMemberIds } from './utils/fetchAllMemberIds.js';
import { useUserSearch } from './hooks/useUserSearch.js';
import { MembersPagination } from './MembersPagination.js';
import type { SearchedUser } from '../chat/types.js';

export interface AddMembersModalProps {
  open:           boolean;
  conversationId: string;
  onClose:        () => void;
  /** Fired after a successful add — the parent should refetch its list. */
  onAdded:        () => void | Promise<void>;
}

/**
 * Modal for adding members to a group conversation.
 *
 * Prevents duplicate adds with two layers of defence:
 *   1. On open, walks every page of `/members` to build a Set of current
 *      member ids, then hides those ids from the search results.
 *   2. On submit, re-filters the selected list against that Set and also
 *      dedupes the ids array itself before calling the API.
 *
 * The backend (`syncParticipants`) is idempotent, so even if the client
 * guard is defeated the database state stays consistent.
 */
export const AddMembersModal = memo(({
  open,
  conversationId,
  onClose,
  onAdded,
}: AddMembersModalProps) => {
  const {
    query,
    results,
    searching,
    page: searchPage,
    totalPages: searchTotalPages,
    total: searchTotal,
    setQuery,
    goToPage: goToSearchPage,
    reset: resetSearch,
  } = useUserSearch({ limit: 10 });

  const [selected,        setSelected]        = useState<SearchedUser[]>([]);
  const [existingIds,     setExistingIds]     = useState<Set<string>>(new Set());
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset + load the full member id set whenever the modal opens.
  useEffect(() => {
    if (!open || !conversationId) return;

    setSelected([]);
    setSubmitError(null);
    setExistingIds(new Set());
    setLoadingExisting(true);
    resetSearch();

    let cancelled = false;

    (async () => {
      try {
        const ids = await fetchAllMemberIds(conversationId);
        if (!cancelled) setExistingIds(ids);
      } catch {
        // Best-effort. Backend idempotency and selection dedupe cover us.
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();

    setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => { cancelled = true; };
  }, [open, conversationId, resetSearch]);

  const toggleSelect = useCallback((u: SearchedUser) => {
    if (existingIds.has(u._id)) return; // defence in depth
    setSelected((prev) =>
      prev.some((s) => s._id === u._id)
        ? prev.filter((s) => s._id !== u._id)
        : [...prev, u],
    );
  }, [existingIds]);

  const handleSubmit = useCallback(async () => {
    if (selected.length === 0 || submitting) return;

    const unique = Array.from(
      new Set(selected.map((u) => u._id).filter((id) => !existingIds.has(id))),
    );
    if (unique.length === 0) {
      setSubmitError('All selected users are already members.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await chatApi.addParticipants(conversationId, unique);
      await onAdded();
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to add members');
    } finally {
      setSubmitting(false);
    }
  }, [selected, submitting, existingIds, conversationId, onAdded]);

  const visibleResults = useMemo(
    () => results.filter((u) => !existingIds.has(u._id)),
    [results, existingIds],
  );
  const alreadyMemberCount = results.length - visibleResults.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <UserPlus size={14} className="text-accent-blue" />
                Add Members
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                {selected.map((u) => (
                  <span
                    key={u._id}
                    onClick={() => toggleSelect(u)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent-blue/20 border border-accent-blue/30 rounded-full text-[9px] text-accent-blue font-bold cursor-pointer hover:bg-accent-blue/30 transition-all"
                  >
                    {u.name}
                    <X size={10} />
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="p-4 pb-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={loadingExisting ? 'Loading current members…' : 'Search users by name or username…'}
                  disabled={loadingExisting}
                  className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors disabled:opacity-60"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {searching && (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              )}

              {!searching && query.trim() && visibleResults.length === 0 && (
                <div className="py-8 text-center space-y-1">
                  <p className="text-[10px] text-white/30">No users available to add</p>
                  {alreadyMemberCount > 0 && (
                    <p className="text-[9px] text-white/20">
                      {alreadyMemberCount} already in this group
                    </p>
                  )}
                </div>
              )}

              {!searching && visibleResults.map((u) => {
                const isSelected = selected.some((s) => s._id === u._id);
                return (
                  <button
                    key={u._id}
                    onClick={() => toggleSelect(u)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04] ${
                      isSelected ? 'bg-accent-blue/10' : ''
                    }`}
                  >
                    <ChatAvatar participant={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{u.name}</p>
                      <p className="text-[9px] text-white/30 truncate">@{u.username}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-accent-blue border-accent-blue' : 'border-white/15'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Search pagination */}
            {query.trim() && searchTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-white/[0.04] bg-white/[0.015]">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  {searchTotal} match{searchTotal === 1 ? '' : 'es'}
                  {alreadyMemberCount > 0 && (
                    <span className="text-white/20"> · {alreadyMemberCount} already in</span>
                  )}
                </p>
                <MembersPagination
                  page={searchPage}
                  totalPages={searchTotalPages}
                  disabled={searching}
                  onChange={goToSearchPage}
                  size="sm"
                />
              </div>
            )}

            {submitError && (
              <div className="px-4 py-2 border-t border-rose-500/20 bg-rose-500/5">
                <p className="text-[10px] font-bold text-rose-200">{submitError}</p>
              </div>
            )}

            {/* Footer actions */}
            <div className="p-4 pt-2 border-t border-white/[0.06] flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/[0.04] text-white/60 border border-white/[0.06] rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={selected.length === 0 || submitting || loadingExisting}
                className="flex-[1.5] py-2.5 bg-accent-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md shadow-accent-blue/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting
                  ? 'Adding…'
                  : selected.length > 0
                    ? `Add ${selected.length} member${selected.length > 1 ? 's' : ''}`
                    : 'Select members'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AddMembersModal.displayName = 'AddMembersModal';
