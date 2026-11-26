import type { User } from '../../../store/authStore.js';
import { dashboardPrefix } from '../../../features/platform/useAccount.js';

/** Role-scoped base for dashboard-nested chat routes. */
export const getChatPrefix = (role: User['role'] | undefined | null): string => dashboardPrefix(role ?? undefined);

/** Full dashboard-nested conversation URL for a given user + conversation id. */
export const getConversationPath = (
  role: User['role'] | undefined | null,
  conversationId: string,
): string => `${getChatPrefix(role)}/chat/${conversationId}`;
