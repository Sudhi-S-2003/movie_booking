import { useCallback, useEffect, useRef } from "react";
import { supportApi } from "../../../services/api/index.js";
import { MESSAGES_PAGE_SIZE } from "../constants.js";
import type { IssueMessage } from "../types.js";
import type {
  MessagesAction,
  WindowLoadMode,
} from "../messageState/messagesReducer.js";


type LoadKind = "initial" | "older" | "newer" | "around";

interface LoadOptions {
  before?: string;
  after?: string;
  around?: string;
  anchor?: string;
}

export interface UseMessageFetcherArgs {
  issueId: string | null;
  dispatch: React.Dispatch<MessagesAction>;
  hasBeforeRef: React.MutableRefObject<boolean>;
  hasAfterRef: React.MutableRefObject<boolean>;
}

export interface UseMessageFetcherReturn {
  loadInitial: (anchorMessageId?: string | null) => Promise<IssueMessage[]>;
  loadBefore:   (cursor: string) => Promise<void>;
  loadAfter:   (cursor: string) => Promise<void>;
  loadAround:  (messageId: string) => Promise<IssueMessage[]>;
}

const KIND_TO_MODE: Record<LoadKind, WindowLoadMode> = {
  initial: "replace",
  around:  "replace",
  older:   "prepend",
  newer:   "append",
};

export function useMessageFetcher({
  issueId,
  dispatch,
  hasBeforeRef,
  hasAfterRef,
}: UseMessageFetcherArgs): UseMessageFetcherReturn {
  const abortRef = useRef<AbortController | null>(null);

  const sentBeforeCursorRef = useRef<string | null>(null);
  const sentAfterCursorRef  = useRef<string | null>(null);

  useEffect(() => {
    sentBeforeCursorRef.current = null;
    sentAfterCursorRef.current  = null;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return () => {
      abortRef.current?.abort();
    };
  }, [issueId]);

  const getAbortController = useCallback(() => {
    if (!abortRef.current) abortRef.current = new AbortController();
    return abortRef.current;
  }, []);

  const hasIssueChanged = useCallback(
    (fetchedFor: string | null) => fetchedFor !== issueId,
    [issueId],
  );

  const fetchMessages = useCallback(
    async (kind: LoadKind, opts: LoadOptions = {}): Promise<IssueMessage[]> => {
      if (!issueId) return [];
      const controller = getAbortController();
      const fetchedFor = issueId;

      dispatch({ type: "FETCH_START", isInitial: kind === "initial" });

      try {
        const params: Record<string, any> = { limit: MESSAGES_PAGE_SIZE };
        if (opts.before) params.before = opts.before;
        if (opts.after)  params.after  = opts.after;
        if (opts.around) params.around = opts.around;
        if (opts.anchor) params.anchor = opts.anchor;

        const res = await supportApi.getMessages(
          issueId,
          params,
          controller.signal,
        );
        if (hasIssueChanged(fetchedFor)) return [];

        const messages: IssueMessage[] = res.messages ?? [];
        dispatch({
          type:        "WINDOW_LOADED",
          mode:        KIND_TO_MODE[kind],
          messages,
          hasBefore:    !!res.hasBefore,
          hasAfter:    !!res.hasAfter,
          beforeCursor: res.beforeCursor ?? null,
          afterCursor: res.afterCursor ?? null,
        });

        if (kind === "around" || kind === "initial") {
          sentBeforeCursorRef.current = null;
          sentAfterCursorRef.current  = null;
        }

        return messages;
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return [];
        console.error(`[useMessageFetcher] ${kind}:`, err);
        dispatch({ type: "FETCH_END" });
        if (kind === "older") sentBeforeCursorRef.current = null;
        if (kind === "newer") sentAfterCursorRef.current  = null;
        return [];
      }
    },
    [issueId, dispatch, getAbortController, hasIssueChanged],
  );

  const loadInitial = useCallback(
    (anchorMessageId?: string | null) =>
      fetchMessages("initial", anchorMessageId ? { anchor: anchorMessageId } : {}),
    [fetchMessages],
  );

  const loadBefore = useCallback(
    async (cursor: string) => {
      if (cursor === sentBeforeCursorRef.current) return; 
      if (!hasBeforeRef.current) return;
      sentBeforeCursorRef.current = cursor;
      await fetchMessages("older", { before: cursor });
    },
    [fetchMessages, hasBeforeRef],
  );

  const loadAfter = useCallback(
    async (cursor: string) => {
      if (cursor === sentAfterCursorRef.current) return;
      if (!hasAfterRef.current) return;
      sentAfterCursorRef.current = cursor;
      await fetchMessages("newer", { after: cursor });
    },
    [fetchMessages, hasAfterRef],
  );

  const loadAround = useCallback(
    (messageId: string) => fetchMessages("around", { around: messageId }),
    [fetchMessages],
  );

  return { loadInitial, loadBefore, loadAfter, loadAround };
}
