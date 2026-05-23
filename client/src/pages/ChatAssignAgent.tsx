import { ChatAssignAgentPage } from '../components/chat-assign/index.js';

/**
 * `/{role}/chat/:conversationId/assign`
 *
 * Thin route wrapper. All page logic lives in the `chat-assign/` feature
 * folder so the page itself stays a single import.
 */
export const ChatAssignAgent = () => <ChatAssignAgentPage />;
