import { useEffect, useRef, useCallback } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import { READ_RECEIPT_DEBOUNCE, VISIBILITY_THRESHOLD } from '../constants.js';

/**
 * IntersectionObserver-based read receipt tracker.
 * Watches message elements via `[data-msg-id]` and flushes
 * visible message IDs in debounced batches.
 */
export const useChatReadReceipts = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  conversationId: string | null,
  currentUserId: string | undefined,
  messages: Array<{ _id: string; senderId?: string | null; isYou?: boolean }>,
) => {
  const queueRef    = useRef<Set<string>>(new Set());
  const reportedRef = useRef<Set<string>>(new Set());
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const flush = useCallback(async () => {
    if (!conversationId || queueRef.current.size === 0) return;
    const ids = [...queueRef.current];
    queueRef.current.clear();

    try {
      await chatApi.markMessagesRead(conversationId, ids);
      ids.forEach((id) => reportedRef.current.add(id));
    } catch (e) {
      // Re-queue on failure
      ids.forEach((id) => queueRef.current.add(id));
    }
  }, [conversationId]);

  useEffect(() => {
    if (!containerRef.current || !conversationId || !currentUserId) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let dirty = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const msgId = (entry.target as HTMLElement).dataset.msgId;
          if (!msgId) continue;
          if (reportedRef.current.has(msgId)) continue;

          // Skip own messages
          const msg = messages.find((m) => m._id === msgId);
          if (msg?.isYou || msg?.senderId === currentUserId) continue;

          queueRef.current.add(msgId);
          dirty = true;
        }

        if (dirty) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => void flush(), READ_RECEIPT_DEBOUNCE);
        }
      },
      { root: containerRef.current, threshold: VISIBILITY_THRESHOLD },
    );

    // Observe all message elements
    const el = containerRef.current;
    const nodes = el.querySelectorAll('[data-msg-id]');
    nodes.forEach((node) => observerRef.current!.observe(node));

    return () => {
      observerRef.current?.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Flush remaining on unmount
        void flush();
      }
    };
  }, [containerRef, conversationId, currentUserId, messages, flush]);

  // Re-observe when messages change
  useEffect(() => {
    if (!containerRef.current || !observerRef.current) return;
    const nodes = containerRef.current.querySelectorAll('[data-msg-id]');
    nodes.forEach((node) => observerRef.current!.observe(node));
  }, [containerRef, messages]);

  /** Reset reported set (on conversation change). */
  const resetReceipts = useCallback(() => {
    queueRef.current.clear();
    reportedRef.current.clear();
  }, []);

  return { resetReceipts };
};
