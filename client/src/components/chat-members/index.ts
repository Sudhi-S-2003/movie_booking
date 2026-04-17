// Public surface of the chat-members feature folder.
//
// Consumers should import from here, not from individual files, so the
// internal structure can change without touching callers.

export { ChatMembersPage } from './ChatMembersPage.js';
export { AddMembersModal } from './AddMembersModal.js';
export { MemberRow }        from './MemberRow.js';
export { MembersEmpty }     from './MembersEmpty.js';
export { MembersSkeleton }  from './MembersSkeleton.js';
export { MembersPagination } from './MembersPagination.js';

export { useChatMembers }   from './hooks/useChatMembers.js';
export { useUserSearch }    from './hooks/useUserSearch.js';

export type { ConversationMeta, UseChatMembersResult } from './hooks/useChatMembers.js';
