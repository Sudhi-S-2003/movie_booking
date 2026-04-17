import { chatApi } from '../../../services/api/chat.api.js';

/** Server caps list endpoints at 50/page; we walk all pages at that size. */
const MEMBERS_FETCH_PAGE = 50;

/**
 * Safety rail — beyond this many pages (2000 members at page size 50) we
 * stop iterating and rely on the backend's idempotent `syncParticipants`
 * as the last line of defence against duplicate inserts.
 */
const MAX_PAGES = 40;

/**
 * Walk every page of `/chat/conversations/:id/members` to collect the
 * complete set of current member ids. Used by the Add Members modal to
 * pre-filter search results so users already in the group don't show up
 * as selectable.
 */
export const fetchAllMemberIds = async (conversationId: string): Promise<Set<string>> => {
  const ids = new Set<string>();

  let currentPage = 1;
  let totalPages  = 1;

  do {
    const res = await chatApi.getMembers(conversationId, {
      page:  currentPage,
      limit: MEMBERS_FETCH_PAGE,
    });
    for (const m of res.members) ids.add(m._id);
    totalPages = res.pagination.totalPages;
    currentPage += 1;
  } while (currentPage <= totalPages && currentPage <= MAX_PAGES);

  return ids;
};
