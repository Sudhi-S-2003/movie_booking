import { useEffect, useRef } from "react";
import { supportApi } from "../../../services/api/index.js";
import type { IssueMessage } from "../types.js";


const FLUSH_DEBOUNCE_MS = 250;

export interface UseReadReceiptsArgs {
  issueId: string | null;
  currentUserId?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  messages: IssueMessage[];
}

export function useReadReceipts({
  issueId,
  currentUserId,
  containerRef,
  messages,
}: UseReadReceiptsArgs) {
  const queuedRef       = useRef<Set<string>>(new Set());
  const reportedRef     = useRef<Set<string>>(new Set());
  const flushTimerRef   = useRef<number | null>(null);
  const observerRef     = useRef<IntersectionObserver | null>(null);
  const messagesRef     = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    queuedRef.current.clear();
    reportedRef.current.clear();
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, [issueId]);

  const flush = () => {
    if (!issueId || queuedRef.current.size === 0) return;
    const batch = Array.from(queuedRef.current);
    queuedRef.current.clear();
    for (const id of batch) reportedRef.current.add(id);
    supportApi
      .markMessagesRead(issueId, batch)
      .catch((err) => {
        for (const id of batch) reportedRef.current.delete(id);
        console.error("[useReadReceipts] markRead failed:", err);
      });
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !issueId || !currentUserId) return;

    const obs = new IntersectionObserver(
      (entries) => {
        let queuedAny = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.msgId;
          if (!id) continue;
          if (reportedRef.current.has(id)) continue;
          const msg = messagesRef.current.find((m) => m._id === id);
          if (!msg || msg.isYou) continue;
          queuedRef.current.add(id);
          queuedAny = true;
        }
        if (queuedAny) {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          flushTimerRef.current = window.setTimeout(flush, FLUSH_DEBOUNCE_MS);
        }
      },
      { root, threshold: 0.6 }, 
    );
    observerRef.current = obs;

    return () => {
      obs.disconnect();
      observerRef.current = null;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, currentUserId]);

  useEffect(() => {
    const obs = observerRef.current;
    const root = containerRef.current;
    if (!obs || !root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-msg-id]");
    nodes.forEach((node) => {
      const id = node.dataset.msgId;
      if (id && !reportedRef.current.has(id)) obs.observe(node);
    });
  }, [messages, containerRef]);
}
