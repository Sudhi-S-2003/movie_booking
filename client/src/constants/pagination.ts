/**
 * Centralized pagination defaults. Every page-size literal in the client
 * should come from here so an engineer tuning one surface can tune them all.
 *
 * Keep these aligned with the server cap in `server/src/utils/pagination.ts`
 * (`PAGINATION.MAX_LIMIT`). Asking for a bigger page than the server will
 * accept just wastes a round-trip.
 */
export const PAGE_SIZE = {
  DEFAULT:    10,
  POSTS:      10,
  COMMENTS:   20,
  FOLLOWERS:  20,
  MOVIES:     12,
  THEATRES:   12,
  REVIEWS:    10,
  WATCHLIST:  12,
  BOOKMARKS:  10,
  ACTIVITY:   15,
  NOTIFICATIONS: 20,
  USERS: 10,
} as const;

/** Hard ceiling; matches the server. Never request more than this. */
export const MAX_PAGE_SIZE = 50;
