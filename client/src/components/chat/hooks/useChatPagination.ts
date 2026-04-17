import { useEffect, useRef, useState } from 'react';

export interface UseChatPaginationArgs {
  conversationId:    string | null;
  /**
   * Set to true only when the scrollable container and both sentinel elements
   * are actually mounted in the DOM (i.e. `!initialLoading`).
   * The effect re-runs when this flips true so the observer is created after
   * the container renders — not during the initial-load spinner phase when
   * all refs are still null.
   */
  ready:             boolean;
  hasBefore:         boolean;
  hasAfter:          boolean;
  beforeCursor:      string | null;
  afterCursor:       string | null;
  loadBefore:        (cursor: string) => Promise<void>;
  loadAfter:         (cursor: string) => Promise<void>;
  containerRef:      React.RefObject<HTMLDivElement | null>;
  topSentinelRef:    React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseChatPaginationReturn {
  /** True while an older-messages fetch is in-flight (scroll-up direction). */
  loadingBefore: boolean;
  /** True while a newer-messages fetch is in-flight (scroll-down direction). */
  loadingAfter:  boolean;
}

/**
 * IntersectionObserver-driven pagination for the chat message thread.
 * Watches top & bottom sentinel elements and triggers load callbacks
 * using server-provided cursors stored in reducer state.
 *
 * Key guarantees:
 * - Per-direction inflight lock: a second load cannot start until the
 *   previous one for that direction has fully resolved.
 * - recheckSentinel fires after a macrotask (setTimeout 0) so React has
 *   committed new DOM before intersection is re-evaluated.
 * - Cursor deduplication handled by useChatMessages as a second defence.
 * - Returns { loadingBefore, loadingAfter } React state so the UI can
 *   render directional loading indicators.
 */
export function useChatPagination({
  conversationId,
  ready,
  hasBefore,
  hasAfter,
  beforeCursor,
  afterCursor,
  loadBefore,
  loadAfter,
  containerRef,
  topSentinelRef,
  bottomSentinelRef,
}: UseChatPaginationArgs): UseChatPaginationReturn {
  const hasBeforeRef    = useRef(hasBefore);
  const hasAfterRef     = useRef(hasAfter);
  const beforeCursorRef = useRef(beforeCursor);
  const afterCursorRef  = useRef(afterCursor);
  hasBeforeRef.current    = hasBefore;
  hasAfterRef.current     = hasAfter;
  beforeCursorRef.current = beforeCursor;
  afterCursorRef.current  = afterCursor;

  // Ref = real inflight guard (no re-render cost, used in observer callback).
  // State = UI signal that mirrors the ref (causes re-render for indicator).
  const loadingBeforeRef = useRef(false);
  const loadingAfterRef  = useRef(false);
  const [loadingBefore, setLoadingBefore] = useState(false);
  const [loadingAfter,  setLoadingAfter]  = useState(false);

  useEffect(() => {
    // Don't create the observer until the container is in the DOM.
    // When initialLoading is true the container div isn't rendered yet,
    // so all refs are null — we must wait for `ready` to flip true.
    if (!ready) return;

    const root   = containerRef.current;
    const top    = topSentinelRef.current;
    const bottom = bottomSentinelRef.current;
    if (!root || !top || !bottom || !conversationId) return;

    /**
     * Re-observe a sentinel after load so the observer re-checks visibility.
     * Uses setTimeout(0) instead of rAF so React has committed new DOM
     * (updated message list + scroll position) before we re-evaluate.
     */
    const recheckSentinel = (el: Element) => {
      setTimeout(() => {
        observer.unobserve(el);
        observer.observe(el);
      }, 0);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (
            entry.target === top &&
            hasBeforeRef.current &&
            beforeCursorRef.current &&
            !loadingBeforeRef.current          // ← inflight guard
          ) {
            loadingBeforeRef.current = true;
            setLoadingBefore(true);
            loadBefore(beforeCursorRef.current)
              .then(() => recheckSentinel(top))
              .finally(() => {
                loadingBeforeRef.current = false;
                setLoadingBefore(false);
              });

          } else if (
            entry.target === bottom &&
            hasAfterRef.current &&
            afterCursorRef.current &&
            !loadingAfterRef.current           // ← inflight guard
          ) {
            loadingAfterRef.current = true;
            setLoadingAfter(true);
            loadAfter(afterCursorRef.current)
              .then(() => recheckSentinel(bottom))
              .finally(() => {
                loadingAfterRef.current = false;
                setLoadingAfter(false);
              });
          }
        }
      },
      {
        root,
        rootMargin: '200px 0px 200px 0px',
        threshold:  0,
      },
    );

    observer.observe(top);
    observer.observe(bottom);
    return () => {
      observer.disconnect();
      // Reset locks and clear UI state on conversation change.
      loadingBeforeRef.current = false;
      loadingAfterRef.current  = false;
      setLoadingBefore(false);
      setLoadingAfter(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, ready]);

  return { loadingBefore, loadingAfter };
}
