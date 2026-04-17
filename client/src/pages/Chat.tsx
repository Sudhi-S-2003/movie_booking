import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { ChatPage } from '../components/chat/index.js';

/**
 * Standalone chat page for use inside dashboard layouts.
 * The ChatPage component handles all state, sockets, and UI.
 */
export const Chat = () => {
  useDocumentTitle('Messages — CinemaConnect');
  return <ChatPage />;
};
