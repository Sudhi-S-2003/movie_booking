import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MessageCircle, Users } from 'lucide-react';
import { chatApi } from '../../../services/api/chat.api.js';
import { ChatAvatar } from '../ui/ChatAvatar.js';
import { useChat } from '../context/ChatContext.js';
import type { SearchedUser } from '../types.js';

interface NewChatModalProps {
  show:    boolean;
  onClose: () => void;
}

export const NewChatModal = memo(({ show, onClose }: NewChatModalProps) => {
  const { createDirectChat, createGroupChat, selectConversation } = useChat();

  const [mode, setMode]                   = useState<'search' | 'group'>('search');
  const [query, setQuery]                 = useState('');
  const [results, setResults]             = useState<SearchedUser[]>([]);
  const [loading, setLoading]             = useState(false);
  const [selected, setSelected]           = useState<SearchedUser[]>([]);
  const [groupTitle, setGroupTitle]       = useState('');
  const [groupPublicName, setGroupPublic] = useState('');
  const [createError, setCreateError]     = useState<string | null>(null);
  const [creating, setCreating]           = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus search on open
  useEffect(() => {
    if (show) {
      setTimeout(() => searchRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelected([]);
      setGroupTitle('');
      setGroupPublic('');
      setCreateError(null);
      setMode('search');
    }
  }, [show]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { users } = await chatApi.searchUsers(q.trim(), { limit: 15 });
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelectUser = useCallback(async (user: SearchedUser) => {
    if (mode === 'group') {
      setSelected((prev) => {
        if (prev.some((u) => u._id === user._id)) {
          return prev.filter((u) => u._id !== user._id);
        }
        return [...prev, user];
      });
      return;
    }

    // Direct chat — create and open
    const conv = await createDirectChat(user._id);
    if (conv) {
      selectConversation(conv);
      onClose();
    }
  }, [mode, createDirectChat, selectConversation, onClose]);

  const handleCreateGroup = useCallback(async () => {
    if (selected.length < 1 || creating) return;

    // publicName is mandatory server-side. Pre-flight the UX check so users
    // get a clearer message than a generic 400.
    const trimmedSlug = groupPublicName.trim();
    if (!trimmedSlug) {
      setCreateError('Public name is required — pick something like "movie-buffs".');
      return;
    }
    if (trimmedSlug.length < 3) {
      setCreateError('Public name must be at least 3 characters.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    const conv = await createGroupChat(
      selected.map((u) => u._id),
      groupTitle.trim() || 'Group Chat',
      trimmedSlug,
    );
    setCreating(false);
    if (conv) {
      selectConversation(conv);
      onClose();
    } else {
      setCreateError('Failed to create group. The public name may already be taken or invalid.');
    }
  }, [selected, groupTitle, groupPublicName, creating, createGroupChat, selectConversation, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
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
              <h3 className="text-sm font-black uppercase tracking-tight text-white">
                New {mode === 'group' ? 'Group' : 'Message'}
              </h3>
              <div className="flex items-center gap-2">
                {/* Toggle mode */}
                <button
                  onClick={() => setMode((m) => m === 'search' ? 'group' : 'search')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                    mode === 'group'
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                      : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60'
                  }`}
                >
                  <Users size={12} className="inline mr-1" />
                  Group
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Group title + optional public name */}
            {mode === 'group' && (
              <div className="px-4 pt-3 space-y-2">
                <input
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Group name..."
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors"
                />
                <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl focus-within:border-white/[0.12] transition-colors">
                  <span className="pl-3 pr-1 text-[10px] font-mono text-white/30 select-none">
                    /chat/g/
                  </span>
                  <input
                    value={groupPublicName}
                    onChange={(e) => setGroupPublic(
                      // Live-normalize to the server's slug rules so users see what they'll get.
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    )}
                    placeholder="public-name (required)"
                    required
                    className="flex-1 pr-3 py-2 bg-transparent text-[11px] text-white placeholder:text-white/20 outline-none"
                  />
                </div>
                <p className="text-[9px] text-white/25 leading-relaxed px-1">
                  Required. Becomes the group's permanent slug at{' '}
                  <code className="text-white/40">/chat/g/your-slug</code> —
                  used by the public resolver and join-request flow. Must be
                  unique across all groups.
                </p>
                {createError && (
                  <p className="text-[10px] font-bold text-rose-300">{createError}</p>
                )}
              </div>
            )}

            {/* Selected users (group mode) */}
            {mode === 'group' && selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pt-2">
                {selected.map((u) => (
                  <span
                    key={u._id}
                    onClick={() => setSelected((prev) => prev.filter((s) => s._id !== u._id))}
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
                  ref={searchRef}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search users by name or username..."
                  className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {loading && (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                </div>
              )}

              {!loading && results.length === 0 && query.trim() && (
                <div className="py-8 text-center">
                  <p className="text-[10px] text-white/20">No users found</p>
                </div>
              )}

              {!loading && results.map((user) => {
                const isSelected = selected.some((s) => s._id === user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => void handleSelectUser(user)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04] ${
                      isSelected ? 'bg-accent-blue/10' : ''
                    }`}
                  >
                    <ChatAvatar participant={{ ...user, username: user.username }} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{user.name}</p>
                      <p className="text-[9px] text-white/30 truncate">@{user.username}</p>
                    </div>
                    {mode === 'search' && (
                      <MessageCircle size={14} className="text-white/20 flex-shrink-0" />
                    )}
                    {mode === 'group' && (
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-accent-blue border-accent-blue'
                          : 'border-white/15'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Group create button */}
            {mode === 'group' && selected.length > 0 && (
              <div className="p-4 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => void handleCreateGroup()}
                  disabled={creating}
                  className="w-full py-2.5 bg-accent-blue text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {creating
                    ? 'Creating…'
                    : `Create Group (${selected.length} member${selected.length === 1 ? '' : 's'})`}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

NewChatModal.displayName = 'NewChatModal';
