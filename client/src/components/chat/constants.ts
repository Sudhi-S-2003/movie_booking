/** Messages fetched per page in cursor-based pagination. */
export const MESSAGES_PAGE_SIZE = 30;

/** Sliding window cap — trim oldest messages when exceeding this. */
export const MAX_MESSAGES = 200;

/** Conversations per page in the list. */
export const CONVERSATIONS_PAGE_SIZE = 20;

/** Debounce delay for read-receipt flush (ms). */
export const READ_RECEIPT_DEBOUNCE = 800;

/** IntersectionObserver threshold for message visibility. */
export const VISIBILITY_THRESHOLD = 0.6;

/** Typing indicator timeout (ms) — stop showing after this long. */
export const TYPING_TIMEOUT = 3000;

/** Max text preview length in conversation list. */
export const PREVIEW_MAX_LENGTH = 80;
