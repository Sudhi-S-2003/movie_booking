import React, { memo, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useChat } from '../context/ChatContext.js';
import { ConversationRow } from './ConversationRow.js';
import { ConversationFilters } from './ConversationFilters.js';

/**
 * Left-panel conversation list with the filter bar (search / type / sort /
 * unread-only) and a "new chat" button.
 *
 * Server-side filters (`q`, `type`, `sortBy`, `sortOrder`) come back pre-paged.
 * The `unreadOnly` switch is applied client-side against `unreadCounts`.
 */
export const ConversationList: React.FC = memo(() => {
  const {
    conversations,
    selectedConversation,
    selectConversation,
    conversationsLoading,
    hasMoreConversations,
    loadMoreConversations,
    unreadCounts,
    setShowNewChat,
    conversationFilters,
    conversationFiltersDirty,
    setConversationFilterQ,
    setConversationFilterType,
    setConversationFilterUnreadOnly,
    setConversationFilterSortBy,
    setConversationFilterSortOrder,
    resetConversationFilters,
  } = useChat();

  // Client-side "unread only" slice — keeps pagination untouched.
  const visibleConversations = useMemo(() => {
    if (!conversationFilters.unreadOnly) return conversations;
    return conversations.filter((c) => (unreadCounts[c._id] ?? 0) > 0);
  }, [conversations, conversationFilters.unreadOnly, unreadCounts]);

  const showEmptyState =
    visibleConversations.length === 0 && !conversationsLoading;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-tight text-white">
            Messages
          </h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 rounded-lg bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center text-accent-blue hover:bg-accent-blue/30 transition-all"
            title="New Chat"
          >
            <Plus size={15} />
          </button>
        </div>

        <ConversationFilters
          value={conversationFilters}
          onChangeQ={setConversationFilterQ}
          onChangeType={setConversationFilterType}
          onToggleUnread={setConversationFilterUnreadOnly}
          onChangeSortBy={setConversationFilterSortBy}
          onChangeSortOrder={setConversationFilterSortOrder}
          onReset={resetConversationFilters}
          isDirty={conversationFiltersDirty}
        />
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {showEmptyState && (
          <EmptyState dirty={conversationFiltersDirty} onReset={resetConversationFilters} />
        )}

        {visibleConversations.map((conv) => (
          <ConversationRow
            key={conv._id}
            conversation={conv}
            isSelected={selectedConversation?._id === conv._id}
            unreadCount={unreadCounts[conv._id] ?? 0}
            onSelect={() => selectConversation(conv)}
          />
        ))}

        {/* Server-side pagination — unaffected by client-side unreadOnly slice. */}
        {hasMoreConversations && (
          <button
            onClick={loadMoreConversations}
            disabled={conversationsLoading}
            className="w-full py-3 text-[10px] text-white/30 hover:text-white/50 transition-colors font-medium"
          >
            {conversationsLoading ? 'Loading...' : 'Load more'}
          </button>
        )}

        {conversationsLoading && visibleConversations.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';

// ── Subcomponents ────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ dirty: boolean; onReset: () => void }> = ({ dirty, onReset }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    {dirty ? (
      <>
        <p className="text-[10px] text-white/30 font-medium">No matches</p>
        <p className="text-[9px] text-white/20 mt-1">Try a different search or clear the filters</p>
        <button
          onClick={onReset}
          className="mt-3 text-[10px] font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors"
        >
          Clear filters
        </button>
      </>
    ) : (
      <>
        <p className="text-[10px] text-white/20 font-medium">No conversations yet</p>
        <p className="text-[9px] text-white/10 mt-1">Start a new chat to begin messaging</p>
      </>
    )}
  </div>
);
