import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import type { ChatMessage } from '../types.js';

interface GuestSession {
  signature: string;
  expiresAt: string;
  name:      string;
}

const DEBOUNCE_MS = 400;
// 0.5 = row must be at least half-visible before it counts as "seen".
// Higher than 0 means brief scroll-through doesn't mark, lower than 1 means
// partially-cut bottom/top rows still register when the user pauses on them.
const VISIBILITY_THRESHOLD = 0.5;

/**
 * Per-message read-receipt reporter.
 *
 * Uses a single IntersectionObserver rooted at `containerRef` to detect which
 * rendered rows cross the visibility threshold. Foreign (non-own) messageIds
 * are queued and flushed to the mark-read endpoint on a debounce.
 *
 * Notes:
 *  - Observed nodes are reconciled each render; newly mounted rows are
 *    observed, removed rows are unobserved.
 *  - `reportedRef` is cleared whenever the conversationId changes.
 *  - On flush failure the ids go back into the queue for retry.
 */
export const useChatReadReceipts = (
  containerRef:  RefObject<HTMLElement | null>,
  conversationId: string | null,
  currentUserId:  string | undefined,
  renderedMessages: ChatMessage[],
  guestSession?:  GuestSession,
): void => {
  // Track the latest values in refs so the observer callback (created once
  // per conversation) always sees fresh data without re-subscribing.
  const messagesRef = useRef(renderedMessages);
  messagesRef.current = renderedMessages;

  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const guestRef = useRef(guestSession);
  guestRef.current = guestSession;

  const queueRef      = useRef<Set<string>>(new Set());
  const reportedRef   = useRef<Set<string>>(new Set());
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observedRef   = useRef<Map<string, Element>>(new Map());
  const observerRef   = useRef<IntersectionObserver | null>(null);

  // Reset reported set whenever the conversation changes.
  useEffect(() => {
    queueRef.current.clear();
    reportedRef.current.clear();
  }, [conversationId]);

  // Create / teardown the IntersectionObserver on conversation change.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !conversationId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let queuedAny = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.intersectionRatio < VISIBILITY_THRESHOLD) continue;

          const el = entry.target as HTMLElement;
          const id = el.dataset.msgId;
          if (!id || reportedRef.current.has(id)) continue;

          // Skip own messages — readers don't acknowledge their own sends.
          const msg = messagesRef.current.find((m) => m._id === id);
          if (!msg) continue;
          const selfId = currentUserIdRef.current;
          const guest  = guestRef.current;
          const isOwn = msg.isYou ?? (guest
            ? (!msg.senderId && msg.senderName === guest.name)
            : (!!selfId && msg.senderId === selfId));
          if (isOwn) continue;

          queueRef.current.add(id);
          queuedAny = true;
        }
        if (queuedAny) scheduleFlush();
      },
      { root, threshold: VISIBILITY_THRESHOLD },
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      observedRef.current.clear();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, containerRef]);

  // Reconcile observed nodes with the rows currently mounted in the DOM.
  useEffect(() => {
    const observer = observerRef.current;
    const root     = containerRef.current;
    if (!observer || !root || !conversationId) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-msg-id]'));
    const liveIds = new Set<string>();
    for (const node of nodes) {
      const id = node.dataset.msgId;
      if (!id) continue;
      liveIds.add(id);
      const prev = observedRef.current.get(id);
      if (prev !== node) {
        if (prev) observer.unobserve(prev);
        observer.observe(node);
        observedRef.current.set(id, node);
      }
    }
    // Unobserve rows that left the DOM.
    for (const [id, el] of observedRef.current) {
      if (!liveIds.has(id)) {
        observer.unobserve(el);
        observedRef.current.delete(id);
      }
    }
  });

  // Flush helper — captured in the observer via closure over the module refs.
  function scheduleFlush(): void {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, DEBOUNCE_MS);
  }

  async function flush(): Promise<void> {
    const convId = conversationId;
    if (!convId) return;
    if (queueRef.current.size === 0) return;

    const ids = Array.from(queueRef.current);
    queueRef.current.clear();

    try {
      const guest = guestRef.current;
      if (guest) {
        await chatApi.markGuestMessagesRead(convId, ids, {
          signature: guest.signature,
          expiresAt: guest.expiresAt,
        });
      } else {
        await chatApi.markMessagesRead(convId, ids);
      }
      for (const id of ids) reportedRef.current.add(id);
    } catch {
      // Re-queue for the next flush attempt.
      for (const id of ids) queueRef.current.add(id);
    }
  }
};
