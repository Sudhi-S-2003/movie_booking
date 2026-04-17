import { useCallback, useEffect, useMemo, useRef, useState } from "react";


const NEAR_BOTTOM_PX = 120;     
const SHOW_FAB_PX    = 220;     
const HIGHLIGHT_MS   = 1800;

export interface UseChatScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  endRef:       React.RefObject<HTMLDivElement | null>;
  topSentinelRef:    React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;
  showScrollBtn: boolean;
  highlightedId: string | null;
  nearBottomRef: React.MutableRefObject<boolean>;
  scrollToBottom: (smooth?: boolean) => void;
  restoreAnchor: () => void;
  scrollToMessageEl: (messageId: string, smooth?: boolean) => boolean;
}

export function useChatScroll(issueId: string | null): UseChatScrollReturn {
  const containerRef     = useRef<HTMLDivElement>(null);
  const endRef           = useRef<HTMLDivElement>(null);
  const topSentinelRef    = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const nearBottomRef = useRef(true);
  const anchorRef     = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        nearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
        setShowScrollBtn(distanceFromBottom > SHOW_FAB_PX);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); 
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [issueId]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [issueId]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = endRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  const restoreAnchor = useCallback(() => {
    const el = containerRef.current;
    const prev = anchorRef.current;
    if (!el || prev == null) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const delta = el.scrollHeight - prev;
        if (delta > 0) el.scrollTop = el.scrollTop + delta;
        anchorRef.current = null;
      });
    });
  }, []);

  const flashHighlight = useCallback((messageId: string) => {
    setHighlightedId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedId(null);
      highlightTimerRef.current = null;
    }, HIGHLIGHT_MS);
  }, []);

  const scrollToMessageEl = useCallback(
    (messageId: string, smooth = true): boolean => {
      const el = containerRef.current?.querySelector(`[data-msg-id="${messageId}"]`);
      if (!el) return false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
          flashHighlight(messageId);
        });
      });
      return true;
    },
    [flashHighlight],
  );

  return useMemo(() => ({
    containerRef,
    endRef,
    topSentinelRef,
    bottomSentinelRef,
    showScrollBtn,
    highlightedId,
    nearBottomRef,
    scrollToBottom,
    restoreAnchor,
    scrollToMessageEl,
  }), [showScrollBtn, highlightedId, scrollToBottom, restoreAnchor, scrollToMessageEl]);
}
