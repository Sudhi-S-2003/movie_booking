import React, { memo } from 'react';
import { Search, Plus } from 'lucide-react';
import { useChat } from '../context/ChatContext.js';
import { ConversationRow } from './ConversationRow.js';

/**
 * Left-panel conversation list with search and "new chat" button.
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
  } = useChat();

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

        {/* Search (placeholder for now) */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 && !conversationsLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-[10px] text-white/20 font-medium">No conversations yet</p>
            <p className="text-[9px] text-white/10 mt-1">Start a new chat to begin messaging</p>
          </div>
        )}

        {conversations.map((conv) => (
          <ConversationRow
            key={conv._id}
            conversation={conv}
            isSelected={selectedConversation?._id === conv._id}
            unreadCount={unreadCounts[conv._id] ?? 0}
            onSelect={() => selectConversation(conv)}
          />
        ))}

        {hasMoreConversations && (
          <button
            onClick={loadMoreConversations}
            disabled={conversationsLoading}
            className="w-full py-3 text-[10px] text-white/30 hover:text-white/50 transition-colors font-medium"
          >
            {conversationsLoading ? 'Loading...' : 'Load more'}
          </button>
        )}

        {conversationsLoading && conversations.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';
