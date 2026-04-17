import { PublicChatPage } from '../components/chat-public/index.js';

/**
 * `/chat/g/:publicName` — public social resolver.
 * Thin route wrapper; logic lives in the `chat-public/` feature folder.
 */
export const PublicChat = () => <PublicChatPage />;
