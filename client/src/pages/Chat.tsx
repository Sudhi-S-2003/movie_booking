import { SEO } from '../components/common/SEO.js';
import { ChatPage } from '../components/chat/index.js';

/**
 * Standalone chat page for use inside dashboard layouts.
 * The ChatPage component handles all state, sockets, and UI.
 */
export const Chat = () => {
  return (
    <>
      <SEO title="Messages" description="Chat with movie fans and theater owners." />
      <ChatPage />
    </>
  );
};
