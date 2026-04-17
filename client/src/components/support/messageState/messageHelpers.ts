
import type { IssueMessage, DeliveryStatus } from "../types.js";
import { MAX_MESSAGES } from "../constants.js";

export const insertChronological = (
  list: IssueMessage[],
  msg: IssueMessage,
): IssueMessage[] => {
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

export const mergePage = (
  current: IssueMessage[],
  page: IssueMessage[],
  position: "prepend" | "append",
): IssueMessage[] => {
  if (page.length === 0) return current;
  const known = new Set(current.map((m) => m._id));
  const fresh = page.filter((m) => !known.has(m._id));
  if (fresh.length === 0) return current;
  return position === "prepend" ? [...fresh, ...current] : [...current, ...fresh];
};

export const applySlidingWindow = (
  list: IssueMessage[],
  grewFrom: "top" | "bottom" | "none",
): { list: IssueMessage[]; trimmedOther: boolean } => {
  if (list.length <= MAX_MESSAGES) return { list, trimmedOther: false };
  if (grewFrom === "top")    return { list: list.slice(0, MAX_MESSAGES), trimmedOther: true };
  if (grewFrom === "bottom") return { list: list.slice(list.length - MAX_MESSAGES), trimmedOther: true };
  return { list: list.slice(list.length - MAX_MESSAGES), trimmedOther: true };
};

export const reconcileOptimistic = (
  list: IssueMessage[],
  tempId: string,
  confirmed: IssueMessage,
): IssueMessage[] => {
  const idx = list.findIndex((m) => m._id === tempId);
  if (idx === -1) return list;
  const dupIdx = list.findIndex((m) => m._id === confirmed._id && !m._status);
  if (dupIdx !== -1) {
    return list.filter((m) => m._id !== tempId);
  }
  const out = list.slice();
  out[idx] = confirmed;
  return out;
};

export const markMessagesRead = (
  list: IssueMessage[],
  messageIds: string[],
): IssueMessage[] => {
  if (messageIds.length === 0) return list;
  const target = new Set(messageIds);
  let changed = false;
  const next = list.map((m) => {
    if (!target.has(m._id)) return m;
    if (m.deliveryStatus === "read") return m;
    changed = true;
    return { ...m, deliveryStatus: "read" as DeliveryStatus };
  });
  return changed ? next : list;
};
