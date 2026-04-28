import { useReducer, useCallback, useRef, useEffect } from 'react';
import { chatApi } from '../../../services/api/chat.api.js';
import { chatMessagesSocket } from '../../../services/socket/chat/index.js';
import { messagesReducer, initialState } from '../messageState/index.js';
import { MESSAGES_PAGE_SIZE } from '../constants.js';
import type { ChatMessage, ReceiptsUpdate } from '../types.js';
import type { WindowLoadMode } from '../messageState/index.js';

// ── Types ────────────────────────────────────────────────────────────────────

type LoadKind = 'initial' | 'older' | 'newer' | 'around';

interface LoadOptions {
  before?: string;
  after?:  string;
  around?: string;
  anchor?: string;
}

const KIND_TO_MODE: Record<LoadKind, WindowLoadMode> = {
  initial: 'replace',
  around:  'replace',
  older:   'prepend',
  newer:   'append',
};

/** Result of the initial load — includes lastReadMessageId from the server. */
export interface InitialLoadResult {
  messages:          ChatMessage[];
  lastReadMessageId: string | null;
}

/**
 * Core message state hook — manages fetch, socket, and optimistic updates
 * for a single conversation.
 *
 * IMPORTANT: Does NOT auto-fetch on conversation change. The orchestrator
 * (ChatContext) must call `loadInitial()` explicitly.
 *
 * The server's smart initial load handles anchor detection automatically:
 * it checks the user's ChatReadCursor and loads centered on the last-read
 * message if there are unread messages. The client just calls loadInitial()
 * with no params — no need to wait for unread counts.
 *
 * Pagination guards (three layers):
 *  - useChatPagination: per-direction inflight lock on the observer side
 *  - loadBefore / loadAfter: isLoadingBeforeRef / isLoadingAfterRef locks
 *  - sentBeforeCursorRef / sentAfterCursorRef: skip identical cursor re-fetches
 *  - Per-request AbortController: cancels in-flight requests on conversation switch
 */
export const useChatMessages = (
  conversationId: string | null,
  currentUserId?: string,
  onIncoming?: (msg: ChatMessage) => void,
  guestSession?: { signature: string; expiresAt: string; name: string },
) => {
  const [state, dispatch] = useReducer(messagesReducer, initialState);
  const abortRef             = useRef<AbortController | null>(null);
  const sentBeforeCursorRef  = useRef<string | null>(null);
  const sentAfterCursorRef   = useRef<string | null>(null);

  // Per-direction in-flight guards (second line of defence after pagination hook).
  const isLoadingBeforeRef = useRef(false);
  const isLoadingAfterRef  = useRef(false);

  // Track refs for latest values (used by socket/pagination closures)
  const hasBeforeRef    = useRef(state.hasBefore);
  const hasAfterRef     = useRef(state.hasAfter);
  const onIncomingRef   = useRef(onIncoming);
  hasBeforeRef.current  = state.hasBefore;
  hasAfterRef.current   = state.hasAfter;
  onIncomingRef.current = onIncoming;

  // Track latest guestSession / currentUserId via refs so the socket handler
  // registered in the effect below sees fresh values without re-subscribing
  // every render. Without these, the handler captured a stale `guestSession`
  // when the effect first ran (e.g. before `name` was hydrated from the
  // conversation doc) and receipts misclassified ownership thereafter.
  const guestSessionRef  = useRef(guestSession);
  guestSessionRef.current = guestSession;

  const currentUserIdRef  = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Forward-ref to the latest `fetchMessages` so the socket reconnect handler
  // below can refetch without the closure capturing a stale fetchMessages
  // from first render. Assigned in an effect after `fetchMessages` is defined.
  const fetchMessagesRef = useRef<((kind: LoadKind) => Promise<InitialLoadResult>) | null>(null);

  // Reset on conversation change — but do NOT auto-fetch
  useEffect(() => {
    // Clear cursor guards and in-flight locks for the previous conversation.
    sentBeforeCursorRef.current = null;
    sentAfterCursorRef.current  = null;
    isLoadingBeforeRef.current  = false;
    isLoadingAfterRef.current   = false;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (conversationId) {
      dispatch({ type: 'RESET', conversationId });
    }

    return () => {
      abortRef.current?.abort();
    };
  }, [conversationId]);

  // Socket subscription
  useEffect(() => {
    if (!conversationId) return;

    chatMessagesSocket.connect();
    chatMessagesSocket.joinConversation(conversationId);

    const unsubs = [
      chatMessagesSocket.on<ChatMessage>('new_message', (msg) => {
        const guest = guestSessionRef.current;
        const selfId = currentUserIdRef.current;
        const isOwn = guest
          ? (!msg.senderId && msg.senderName === guest.name)
          : (!!selfId && msg.senderId === selfId);

        if (isOwn) return;
        const decorated = { ...msg, isYou: false };
        dispatch({ type: 'SOCKET_NEW', message: decorated });
        onIncomingRef.current?.(decorated);
      }),
      chatMessagesSocket.on<ReceiptsUpdate>('receipts_update', (payload) => {
        if (payload.conversationId !== conversationId) return;

        const guest = guestSessionRef.current;
        const selfId = currentUserIdRef.current;
        const isMe = guest
          ? payload.externalUserName === guest.name
          : !!selfId && payload.userId === selfId;
        if (isMe) return;

        const ids = Array.isArray(payload.messageIds) ? payload.messageIds : [];
        if (ids.length === 0) return;
        dispatch({ type: 'RECEIPTS_UPDATE', messageIds: ids });
      }),
      chatMessagesSocket.on<{ conversationId: string; messageId: string }>(
        'message_deleted',
        (payload) => {
          if (payload.conversationId !== conversationId) return;
          dispatch({ type: 'MESSAGE_DELETED', messageId: payload.messageId });
        },
      ),
      // On reconnect, refetch the current window so we pick up any receipts /
      // new messages / deletions that fired while we were disconnected.
      chatMessagesSocket.onReconnect(() => {
        void fetchMessagesRef.current?.('initial');
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      chatMessagesSocket.leaveConversation(conversationId);
      chatMessagesSocket.disconnect();
    };
   
  }, [conversationId, currentUserId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getAbortController = useCallback(() => {
    if (!abortRef.current) abortRef.current = new AbortController();
    return abortRef.current;
  }, []);

  const hasConversationChanged = useCallback(
    (fetchedFor: string | null) => fetchedFor !== conversationId,
    [conversationId],
  );

  /**
   * Generic page loader — mirrors support's useMessageFetcher.fetchMessages.
   * No shared inflightRef; each direction uses its own cursor guard.
   * Returns { messages, lastReadMessageId }.
   */
  const fetchMessages = useCallback(
    async (kind: LoadKind, opts: LoadOptions = {}): Promise<InitialLoadResult> => {
      if (!conversationId) return { messages: [], lastReadMessageId: null };
      const controller = getAbortController();
      const fetchedFor = conversationId;

      dispatch({ type: 'FETCH_START', isInitial: kind === 'initial' });

      try {
        const params: Record<string, any> = { limit: MESSAGES_PAGE_SIZE };
        if (opts.before) params.before = opts.before;
        if (opts.after)  params.after  = opts.after;
        if (opts.around) params.around = opts.around;
        if (opts.anchor) params.anchor = opts.anchor;

        const res = guestSession
          ? await chatApi.getGuestMessages(
            conversationId,
            { ...params, signature: guestSession.signature, expiresAt: guestSession.expiresAt },
            controller.signal,
          )
          : await chatApi.getMessages(
            conversationId,
            params,
            controller.signal,
          );
        if (hasConversationChanged(fetchedFor)) return { messages: [], lastReadMessageId: null };

        const messages: ChatMessage[] = res.messages ?? [];
        dispatch({
          type:         'WINDOW_LOADED',
          mode:         KIND_TO_MODE[kind],
          messages,
          hasBefore:    !!res.hasBefore,
          hasAfter:     !!res.hasAfter,
          beforeCursor: res.beforeCursor ?? null,
          afterCursor:  res.afterCursor ?? null,
        });

        // On window replacement (initial/around), clear the sentinel cursor guards
        // so the pagination hook can use the fresh cursors from the new window.
        // We do this AFTER dispatch so the new cursors are already reflected in
        // state before the observer can fire again.
        if (kind === 'around' || kind === 'initial') {
          sentBeforeCursorRef.current = null;
          sentAfterCursorRef.current  = null;
        }

        return {
          messages,
          lastReadMessageId: res.lastReadMessageId ?? null,
        };
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') {
          return { messages: [], lastReadMessageId: null };
        }
        console.error(`[useChatMessages] ${kind}:`, err);
        dispatch({ type: 'FETCH_END' });
        if (kind === 'older') sentBeforeCursorRef.current = null;
        if (kind === 'newer') sentAfterCursorRef.current  = null;
        return { messages: [], lastReadMessageId: null };
      }
    },
    [conversationId, getAbortController, hasConversationChanged],
  );

  // Keep the forward-ref in sync so the socket reconnect handler always
  // calls the latest fetchMessages.
  fetchMessagesRef.current = fetchMessages;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Initial load — the server handles anchor detection automatically via
   * ChatReadCursor. Returns messages + lastReadMessageId so the caller can
   * scroll to the right position and render the unread divider.
   */
  const loadInitial = useCallback(
    (): Promise<InitialLoadResult> => fetchMessages('initial'),
    [fetchMessages],
  );

  /**
   * Load older messages (scroll up).
   * Guards:
   *  1. Same cursor already in-flight or already fetched → skip.
   *  2. hasBefore is false → skip (no more pages).
   *  3. Another directional fetch for "before" is still in-flight → skip
   *     (second line of defence; the pagination hook's lock is the first).
   */
  const loadBefore = useCallback(
    async (cursor: string) => {
      if (cursor === sentBeforeCursorRef.current) return;
      if (!hasBeforeRef.current) return;
      if (isLoadingBeforeRef.current) return;
      isLoadingBeforeRef.current  = true;
      sentBeforeCursorRef.current = cursor;
      try {
        await fetchMessages('older', { before: cursor });
      } finally {
        isLoadingBeforeRef.current = false;
      }
    },
    [fetchMessages],
  );

  /**
   * Load newer messages (scroll down).
   * Guards:
   *  1. Same cursor already in-flight or already fetched → skip.
   *  2. hasAfter is false → skip (no more pages).
   *  3. Another directional fetch for "after" is still in-flight → skip.
   */
  const loadAfter = useCallback(
    async (cursor: string) => {
      if (cursor === sentAfterCursorRef.current) return;
      if (!hasAfterRef.current) return;
      if (isLoadingAfterRef.current) return;
      isLoadingAfterRef.current  = true;
      sentAfterCursorRef.current = cursor;
      try {
        await fetchMessages('newer', { after: cursor });
      } finally {
        isLoadingAfterRef.current = false;
      }
    },
    [fetchMessages],
  );

  /**
   * Load a window centered on a specific message (for jump-to-message).
   */
  const loadAround = useCallback(
    async (messageId: string): Promise<ChatMessage[]> => {
      const result = await fetchMessages('around', { around: messageId });
      return result.messages;
    },
    [fetchMessages],
  );

  // Optimistic message helpers
  const appendOptimistic = useCallback((msg: ChatMessage) => {
    dispatch({ type: 'APPEND_OPTIMISTIC', message: msg });
  }, []);

  const confirmOptimistic = useCallback((tempId: string, confirmed: ChatMessage) => {
    dispatch({ type: 'CONFIRM_OPTIMISTIC', tempId, confirmed });
  }, []);

  const removeOptimistic = useCallback((messageId: string) => {
    dispatch({ type: 'REMOVE_MESSAGE', messageId });
  }, []);

  return {
    messages:       state.messages,
    loading:        state.loading,
    initialLoading: state.initialLoading,
    hasBefore:       state.hasBefore,
    hasAfter:       state.hasAfter,
    beforeCursor:    state.beforeCursor,
    afterCursor:    state.afterCursor,
    loadInitial,
    loadBefore,
    loadAfter,
    loadAround,
    appendOptimistic,
    confirmOptimistic,
    removeOptimistic,
  };
};
