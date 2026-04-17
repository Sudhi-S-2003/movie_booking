import { useEffect, useRef } from "react";

export interface UseChatPaginationArgs {
  issueId: string | null;
  hasBefore: boolean;
  hasAfter: boolean;
  beforeCursor: string | null;
  afterCursor: string | null;
  loadBefore: (cursor: string) => Promise<void>;
  loadAfter: (cursor: string) => Promise<void>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * IntersectionObserver-driven pagination for the support chat thread.
 * Uses server-provided cursors stored in reducer state.
 *
 * After each load resolves, forces the observer to re-evaluate by
 * unobserving + re-observing the sentinel. This handles the case where
 * the sentinel stays visible after loading (small batch, viewport larger
 * than page, etc.).
 */
export function useChatPagination({
  issueId,
  hasBefore,
  hasAfter,
  beforeCursor,
  afterCursor,
  loadBefore,
  loadAfter,
  containerRef,
  topSentinelRef,
  bottomSentinelRef,
}: UseChatPaginationArgs) {
  const hasBeforeRef    = useRef(hasBefore);
  const hasAfterRef     = useRef(hasAfter);
  const beforeCursorRef = useRef(beforeCursor);
  const afterCursorRef  = useRef(afterCursor);
  hasBeforeRef.current    = hasBefore;
  hasAfterRef.current     = hasAfter;
  beforeCursorRef.current = beforeCursor;
  afterCursorRef.current  = afterCursor;

  useEffect(() => {
    const root = containerRef.current;
    const top = topSentinelRef.current;
    const bottom = bottomSentinelRef.current;
    if (!root || !top || !bottom || !issueId) return;

    /** Re-observe a sentinel after load so the observer re-checks visibility. */
    const recheckSentinel = (el: Element) => {
      requestAnimationFrame(() => {
        observer.unobserve(el);
        observer.observe(el);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (entry.target === top && hasBeforeRef.current && beforeCursorRef.current) {
            loadBefore(beforeCursorRef.current).then(() => recheckSentinel(top));
          } else if (entry.target === bottom && hasAfterRef.current && afterCursorRef.current) {
            loadAfter(afterCursorRef.current).then(() => recheckSentinel(bottom));
          }
        }
      },
      {
        root,
        rootMargin: "200px 0px 200px 0px",
        threshold: 0,
      },
    );

    observer.observe(top);
    observer.observe(bottom);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);
}
