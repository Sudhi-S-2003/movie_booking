import React from 'react';
import { ChatProvider, useChat } from './context/ChatContext.js';
import { ConversationList } from './components/ConversationList.js';
import { ChatPanel } from './components/ChatPanel.js';
import { NewChatModal } from './components/NewChatModal.js';

/**
 * Full-page WhatsApp-inspired chat layout.
 * Left: conversation list. Right: active chat.
 * Wraps everything in ChatProvider.
 */
export const ChatPage: React.FC<{ 
  guestSession?: { signature: string; expiresAt: string } 
}> = ({ guestSession }) => {
  const memoizedGuest = React.useMemo(() => 
    guestSession ? { ...guestSession, name: '' } : undefined,
    [guestSession]
  );

  return (
    <ChatProvider guestSession={memoizedGuest}>
      <ChatPageInner isGuest={!!guestSession} />
    </ChatProvider>
  );
};

const ChatPageInner: React.FC<{ isGuest?: boolean }> = ({ isGuest }) => {
  const { selectedConversation, showNewChat, setShowNewChat } = useChat();

  const hasChat = !!selectedConversation;

  return (
    <div 
      className={`flex flex-col flex-1 ${isGuest ? 'h-screen w-full' : 'min-h-0'} overflow-hidden bg-[#09090b] relative`}
      style={{
        backgroundImage: 'radial-gradient(at top left, rgba(139, 92, 246, 0.08), transparent 40%), radial-gradient(at bottom right, rgba(59, 130, 246, 0.05), transparent 40%)'
      }}
    >
      <div className={`flex-1 min-h-0 ${isGuest ? 'flex' : 'grid lg:grid-cols-[360px_1fr] grid-rows-[1fr]'} overflow-hidden z-10`}>
        {/* Conversation list — hidden if guest or on mobile when chat is open */}
        {!isGuest && (
          <div className={`min-h-0 flex flex-col overflow-hidden border-r border-white/[0.06] bg-white/[0.01] ${
            hasChat ? 'hidden lg:flex' : 'flex'
          }`}>
            <ConversationList />
          </div>
        )}

        {/* Chat panel — full width for guests or hidden on mobile when no chat open */}
        <div className={`min-h-0 flex flex-col flex-1 overflow-hidden ${
          isGuest || hasChat ? 'flex' : 'hidden lg:flex'
        }`}>
          <ChatPanel />
        </div>
      </div>

      {/* New chat modal */}
      <NewChatModal show={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
};
