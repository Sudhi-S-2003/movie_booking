import type { User } from '../../../store/authStore.js';

/**
 * Role-scoped base for dashboard-nested chat routes.
 *
 * The chat UI lives inside three sibling layouts (owner / admin / user), so
 * opening a conversation from a public resolver needs to pick the right
 * prefix based on the current user's role.
 */
export const getChatPrefix = (role: User['role'] | undefined | null): string => {
  switch (role) {
    case 'admin':          return '/admin';
    case 'theatre_owner':  return '/owner';
    default:               return '/user';
  }
};

/** Full dashboard-nested conversation URL for a given user + conversation id. */
export const getConversationPath = (
  role: User['role'] | undefined | null,
  conversationId: string,
): string => `${getChatPrefix(role)}/chat/${conversationId}`;
