import React, { memo } from 'react';
import { useChat } from '../context/ChatContext.js';
import { ChatHeader } from './ChatHeader.js';
import { MessageThread } from './MessageThread.js';
import { MessageComposer } from './MessageComposer.js';
import { EmptyState } from '../ui/EmptyState.js';

/**
 * Right-panel chat view: header + message thread + composer.
 * Shows an empty state when no conversation is selected.
 */
export const ChatPanel = memo(() => {
  const {
    selectedConversation,
    selectConversation,
    messages,
    messagesLoading,
    initialLoading,
    hasBefore,
    hasAfter,
    beforeCursor,
    afterCursor,
    loadBeforeMessages,
    loadAfterMessages,
    sendMessage,
    deleteMessage,
    scroll,
    scrollToMessage,
    lastReadMessageId,
    typingUsers,
    sendTyping,
    sendStopTyping,
    replyingTo,
    setReplyingTo,
    currentUserId,
  } = useChat();

  if (!selectedConversation) {
    return (
      <EmptyState
        title="No chat selected"
        subtitle="Select a conversation from the list or start a new one"
      />
    );
  }

  const isSystem = selectedConversation.type === 'system';

  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatHeader
        conversation={selectedConversation}
        currentUserId={currentUserId}
        typingUsers={typingUsers}
        onBack={() => selectConversation(null)}
      />

      <MessageThread
        messages={messages}
        initialLoading={initialLoading}
        hasBefore={hasBefore}
        hasAfter={hasAfter}
        beforeCursor={beforeCursor}
        afterCursor={afterCursor}
        conversationId={selectedConversation._id}
        currentUserId={currentUserId}
        lastReadMessageId={lastReadMessageId}
        typingUsers={typingUsers}
        scroll={scroll}
        onLoadBefore={loadBeforeMessages}
        onLoadAfter={loadAfterMessages}
        onReply={setReplyingTo}
        onDelete={deleteMessage}
        onJumpToMessage={scrollToMessage}
      />

      {!isSystem && (
        <MessageComposer
          replyingTo={replyingTo}
          onClearReply={() => setReplyingTo(null)}
          onSend={sendMessage}
          onTyping={sendTyping}
          onStopTyping={sendStopTyping}
        />
      )}

      {isSystem && (
        <div className="flex-shrink-0 border-t border-white/[0.06] py-3 text-center">
          <p className="text-[9px] text-white/20 font-medium uppercase tracking-wider">
            System notifications — replies are not available
          </p>
        </div>
      )}
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';
