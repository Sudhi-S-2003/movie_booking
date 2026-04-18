import type { ChatMessage, DeliveryStatus } from '../types.js';
import { MAX_MESSAGES } from '../constants.js';

/**
 * Binary-search insert into a chronologically sorted array.
 * Uses _id tie-breaking when timestamps match (mirrors support).
 */
export const insertChronological = (
  list: ChatMessage[],
  msg: ChatMessage,
): ChatMessage[] => {
  // Avoid dupes
  if (list.some((m) => m._id === msg._id)) return list;

  const ts = new Date(msg.createdAt).getTime();
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const midTs = new Date(list[mid]!.createdAt).getTime();
    if (midTs < ts || (midTs === ts && list[mid]!._id < msg._id)) lo = mid + 1;
    else hi = mid;
  }
  const out = list.slice();
  out.splice(lo, 0, msg);
  return out;
};

/** Merge a fetched page into the existing array, deduplicating. */
export const mergePage = (
  current: ChatMessage[],
  page: ChatMessage[],
  position: 'prepend' | 'append',
): ChatMessage[] => {
  if (page.length === 0) return current;
  const known = new Set(current.map((m) => m._id));
  const fresh = page.filter((m) => !known.has(m._id));
  if (fresh.length === 0) return current;
  return position === 'prepend' ? [...fresh, ...current] : [...current, ...fresh];
};

/**
 * Trim to MAX_MESSAGES, keeping the side we just grew FROM visible.
 * Returns { list, trimmedOther } so the reducer can re-enable pagination
 * flags for the trimmed side.
 */
export const applySlidingWindow = (
  list: ChatMessage[],
  grewFrom: 'top' | 'bottom' | 'none',
): { list: ChatMessage[]; trimmedOther: boolean } => {
  if (list.length <= MAX_MESSAGES) return { list, trimmedOther: false };
  if (grewFrom === 'top')    return { list: list.slice(0, MAX_MESSAGES), trimmedOther: true };
  if (grewFrom === 'bottom') return { list: list.slice(list.length - MAX_MESSAGES), trimmedOther: true };
  return { list: list.slice(list.length - MAX_MESSAGES), trimmedOther: true };
};

/**
 * Replace a temp optimistic message with the confirmed server copy.
 * Handles the race where the socket event already delivered the confirmed
 * message — in that case we just remove the temp entry.
 */
export const reconcileOptimistic = (
  list: ChatMessage[],
  tempId: string,
  confirmed: ChatMessage,
): ChatMessage[] => {
  const idx = list.findIndex((m) => m._id === tempId);
  if (idx === -1) return list;
  // If the server copy already exists (delivered via socket before HTTP confirm),
  // just drop the temp entry to avoid duplicates.
  const dupIdx = list.findIndex((m) => m._id === confirmed._id && !m._status);
  if (dupIdx !== -1) {
    return list.filter((m) => m._id !== tempId);
  }
  const out = list.slice();
  out[idx] = confirmed;
  return out;
};

/**
 * Flip a specific set of own-messages to `deliveryStatus: 'read'`.
 * Returns the original array reference if nothing changed (optimisation).
 */
export const markMessagesRead = (
  list: ChatMessage[],
  messageIds: string[],
): ChatMessage[] => {
  if (messageIds.length === 0) return list;
  const ids = new Set(messageIds);
  let changed = false;
  const next = list.map((m) => {
    if (m.deliveryStatus === 'read') return m;
    if (!ids.has(m._id)) return m;
    changed = true;
    return { ...m, deliveryStatus: 'read' as DeliveryStatus };
  });
  return changed ? next : list;
};
