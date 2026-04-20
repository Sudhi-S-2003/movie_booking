import React from 'react';
import { ChatProvider, useChat } from './context/ChatContext.js';
import { ConversationList } from './components/ConversationList.js';
import { ChatPanel } from './components/ChatPanel.js';
import { NewChatModal } from './components/NewChatModal.js';
import { useIsLgUp } from '../../hooks/useMediaQuery.js';

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
  const isLgUp = useIsLgUp();

  // Below LG we fully unmount the hidden pane so the mounted one actually owns
  // 100% of the viewport (display:none alone still left intersection observers
  // live which confused the virtualizer's initial measurement on first open).
  const showList = !isGuest && (isLgUp || !hasChat);
  const showPanel = isGuest || isLgUp || hasChat;

  return (
    <div
      className={`flex flex-col flex-1 ${isGuest ? 'w-full' : 'min-h-0'} overflow-hidden bg-[#09090b] relative`}
      style={{
        // 100dvh so the mobile URL bar / on-screen keyboard don't push the
        // composer off-screen. Only applied to the guest standalone route —
        // the embedded dashboard route inherits its own layout.
        ...(isGuest ? { height: '100dvh' } : {}),
        backgroundImage: 'radial-gradient(at top left, rgba(139, 92, 246, 0.08), transparent 40%), radial-gradient(at bottom right, rgba(59, 130, 246, 0.05), transparent 40%)',
      }}
    >
      <div
        className={`flex-1 min-h-0 min-w-0 overflow-hidden overflow-x-hidden z-10 ${
          isGuest ? 'flex' : 'grid lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] grid-rows-[1fr]'
        }`}
      >
        {/* Conversation list */}
        {showList && (
          <div className="min-h-0 min-w-0 flex flex-col overflow-hidden border-r border-white/[0.06] bg-white/[0.01]">
            <ConversationList />
          </div>
        )}

        {/* Chat panel */}
        {showPanel && (
          <div className="min-h-0 min-w-0 flex flex-col flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        )}
      </div>

      {/* New chat modal */}
      <NewChatModal show={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
};
