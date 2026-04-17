import { ChatMembersPage } from '../components/chat-members/index.js';

/**
 * `/{role}/chat/:conversationId/members`
 *
 * Thin route wrapper. All page logic lives in the `chat-members/` feature
 * folder so the page itself stays a single import.
 */
export const ChatMembers = () => <ChatMembersPage />;
