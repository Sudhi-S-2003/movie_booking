import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  messagesReducer,
  initialState,
} from "../messageState/messagesReducer.js";
import { useMessageFetcher } from "./useMessageFetcher.js";
import { useChatScroll } from "./useChatScroll.js";
import { useChatSocket } from "./useChatSocket.js";
import { useReadReceipts } from "./useReadReceipts.js";
import { useChatPagination } from "./useChatPagination.js";
import type { IssueMessage } from "../types.js";

const afterPaint = (fn: () => void) => {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

const findScrollTarget = (
  messages: IssueMessage[],
  anchorMessageId: string | null,
): string | null => {
  if (!anchorMessageId) return null;
  const idx = messages.findIndex((m) => m._id === anchorMessageId);
  if (idx === -1) return null;
  if (idx < messages.length - 1) return messages[idx + 1]?._id ?? anchorMessageId;
  return anchorMessageId;
};


export interface UseMessagesReturn {
  messages: IssueMessage[];
  loading: boolean;
  initialLoading: boolean;
  hasBefore: boolean;
  hasAfter: boolean;
  showScrollBtn: boolean;
  highlightedId: string | null;

  containerRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;

  scrollToBottom: (smooth?: boolean) => void;
  scrollToMessage: (messageId: string) => Promise<void>;

  appendOptimistic: (msg: IssueMessage) => void;
  confirmOptimistic: (tempId: string, confirmed: IssueMessage) => void;
  removeOptimistic: (id: string) => void;
}

export function useMessages(
  selectedIssue: any,
  currentUserId?: string,
  anchorMessageId: string | null = null,
): UseMessagesReturn {
  const issueId: string | null = selectedIssue?._id ?? null;

  const [state, dispatch] = useReducer(messagesReducer, initialState);

  const hasBeforeRef = useRef(state.hasBefore);
  const hasAfterRef = useRef(state.hasAfter);
  hasBeforeRef.current = state.hasBefore;
  hasAfterRef.current = state.hasAfter;

  const scroll = useChatScroll(issueId);
  const fetcher = useMessageFetcher({
    issueId,
    dispatch,
    hasBeforeRef,
    hasAfterRef,
  });

  useEffect(() => {
    dispatch({ type: "RESET", issueId });
    if (!issueId) return;

    fetcher.loadInitial(anchorMessageId).then((loaded) => {
      afterPaint(() => {
        const target = findScrollTarget(loaded, anchorMessageId);
        if (target) {
          const ok = scroll.scrollToMessageEl(target, false);
          if (!ok) scroll.scrollToBottom(false);
        } else {
          scroll.scrollToBottom(false);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  useChatSocket({
    issueId,
    currentUserId,
    dispatch,
    onIncoming: (msg) => {
      if (msg.isYou || scroll.nearBottomRef.current) {
        requestAnimationFrame(() => scroll.scrollToBottom(true));
      }
    },
  });

  useReadReceipts({
    issueId,
    currentUserId,
    containerRef: scroll.containerRef,
    messages: state.messages,
  });

  // Wrap loadOlder with scroll anchor save/restore so the viewport
  // doesn't jump when older messages are prepended above.
  const loadBeforeWithAnchor = useCallback(
    async (cursor: string) => {
      scroll.saveAnchor();
      await fetcher.loadBefore(cursor);
      scroll.restoreAnchor();
    },
    [fetcher, scroll],
  );

  useChatPagination({
    issueId,
    hasBefore: state.hasBefore,
    hasAfter: state.hasAfter,
    beforeCursor: state.beforeCursor,
    afterCursor: state.afterCursor,
    loadBefore: loadBeforeWithAnchor,
    loadAfter: fetcher.loadAfter,
    containerRef: scroll.containerRef,
    topSentinelRef: scroll.topSentinelRef,
    bottomSentinelRef: scroll.bottomSentinelRef,
  });

  const appendOptimistic = useCallback((msg: IssueMessage) => {
    dispatch({ type: "APPEND_OPTIMISTIC", message: msg });
    requestAnimationFrame(() => scroll.scrollToBottom(true));
  }, [scroll]);

  const confirmOptimistic = useCallback(
    (tempId: string, confirmed: IssueMessage) => {
      dispatch({ type: "CONFIRM_OPTIMISTIC", tempId, confirmed });
    },
    [],
  );

  const removeOptimistic = useCallback((id: string) => {
    dispatch({ type: "REMOVE_MESSAGE", messageId: id });
  }, []);

  const scrollToMessage = useCallback(
    async (messageId: string) => {
      if (!issueId) return;
      if (state.messages.some((m) => m._id === messageId)) {
        scroll.scrollToMessageEl(messageId);
        return;
      }
      await fetcher.loadAround(messageId);
      afterPaint(() => scroll.scrollToMessageEl(messageId));
    },
    [issueId, state.messages, fetcher, scroll],
  );

  return {
    messages: state.messages,
    loading: state.loading,
    initialLoading: state.initialLoading,
    hasBefore: state.hasBefore,
    hasAfter: state.hasAfter,
    showScrollBtn: scroll.showScrollBtn,
    highlightedId: scroll.highlightedId,

    containerRef: scroll.containerRef,
    endRef: scroll.endRef,
    topSentinelRef: scroll.topSentinelRef,
    bottomSentinelRef: scroll.bottomSentinelRef,

    scrollToBottom: scroll.scrollToBottom,
    scrollToMessage,

    appendOptimistic,
    confirmOptimistic,
    removeOptimistic,
  };
}
