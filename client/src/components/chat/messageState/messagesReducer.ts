import type { ChatMessage } from '../types.js';
import {
  insertChronological,
  mergePage,
  applySlidingWindow,
  reconcileOptimistic,
  markMessagesRead,
} from './messageHelpers.js';

// ── State ────────────────────────────────────────────────────────────────────

export type WindowLoadMode = 'replace' | 'prepend' | 'append';

export interface MessagesState {
  messages:       ChatMessage[];
  hasBefore:       boolean;
  hasAfter:       boolean;
  beforeCursor:    string | null;
  afterCursor:    string | null;
  initialLoading: boolean;
  loading:        boolean;
  conversationId: string | null;
}

export const initialState: MessagesState = {
  messages:       [],
  hasBefore:       false,
  hasAfter:       false,
  beforeCursor:    null,
  afterCursor:    null,
  initialLoading: false,
  loading:        false,
  conversationId: null,
};

// ── Actions ──────────────────────────────────────────────────────────────────

export type MessagesAction =
  | { type: 'RESET'; conversationId: string }
  | { type: 'FETCH_START'; isInitial: boolean }
  | { type: 'FETCH_END' }
  | {
      type: 'WINDOW_LOADED';
      messages:    ChatMessage[];
      hasBefore:    boolean;
      hasAfter:    boolean;
      beforeCursor: string | null;
      afterCursor: string | null;
      mode:        WindowLoadMode;
    }
  | { type: 'APPEND_OPTIMISTIC'; message: ChatMessage }
  | { type: 'CONFIRM_OPTIMISTIC'; tempId: string; confirmed: ChatMessage }
  | { type: 'REMOVE_MESSAGE'; messageId: string }
  | { type: 'SOCKET_NEW'; message: ChatMessage }
  | { type: 'RECEIPTS_UPDATE'; messageIds: string[] }
  | { type: 'MESSAGE_DELETED'; messageId: string };

// ── Reducer ──────────────────────────────────────────────────────────────────

export const messagesReducer = (
  state: MessagesState,
  action: MessagesAction,
): MessagesState => {
  switch (action.type) {
    case 'RESET':
      return { ...initialState, conversationId: action.conversationId };

    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        initialLoading: action.isInitial ? true : state.initialLoading,
      };

    case 'FETCH_END':
      return { ...state, loading: false, initialLoading: false };

    case 'WINDOW_LOADED': {
      if (action.mode === 'replace') {
        const optimistic = state.messages.filter((m) => !!m._status);
        const merged = [...action.messages, ...optimistic];
        merged.sort((a, b) => {
          const tA = new Date(a.createdAt).getTime();
          const tB = new Date(b.createdAt).getTime();
          if (tA !== tB) return tA - tB;
          return a._id.localeCompare(b._id);
        });

        const { list } = applySlidingWindow(merged, 'none');
        return {
          ...state,
          messages:       list,
          hasBefore:       action.hasBefore,
          hasAfter:       action.hasAfter,
          beforeCursor:    action.beforeCursor,
          afterCursor:    action.afterCursor,
          loading:        false,
          initialLoading: false,
        };
      }

      const merged = mergePage(
        state.messages,
        action.messages,
        action.mode,
      );
      const grewFrom = action.mode === 'prepend' ? 'top' : 'bottom';
      const { list, trimmedOther } = applySlidingWindow(merged, grewFrom);

      // Update cursor for the direction we loaded.
      // When sliding window trims the other side, recompute that cursor from the edge message.
      let beforeCursor = action.mode === 'prepend' ? action.beforeCursor : state.beforeCursor;
      let afterCursor = action.mode === 'append'  ? action.afterCursor : state.afterCursor;

      if (trimmedOther && list.length > 0) {
        if (grewFrom === 'top') {
          // Grew from top (prepend), trimmed bottom → recompute afterCursor from last message
          const last = list[list.length - 1]!;
          afterCursor = `${new Date(last.createdAt).toISOString()}_${last._id}`;
        } else {
          // Grew from bottom (append), trimmed top → recompute beforeCursor from first message
          const first = list[0]!;
          beforeCursor = `${new Date(first.createdAt).toISOString()}_${first._id}`;
        }
      }

      return {
        ...state,
        messages: list,
        hasBefore: action.mode === 'prepend'
          ? action.hasBefore
          : state.hasBefore || trimmedOther,
        hasAfter: action.mode === 'append'
          ? action.hasAfter
          : state.hasAfter || trimmedOther,
        beforeCursor,
        afterCursor,
        loading: false,
      };
    }

    case 'APPEND_OPTIMISTIC': {
      const exists = state.messages.some(
        (m) => m._id === action.message._id && !m._status,
      );
      if (exists) return state;
      return { ...state, messages: [...state.messages, action.message] };
    }

    case 'CONFIRM_OPTIMISTIC':
      return {
        ...state,
        messages: reconcileOptimistic(state.messages, action.tempId, action.confirmed),
      };

    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter((m) => m._id !== action.messageId),
      };

    case 'SOCKET_NEW': {
      // Check if there's a matching optimistic message (by ID or sender+text)
      const optIdx = state.messages.findIndex(
        (m) =>
          m._status === 'sending' &&
          (m._id === action.message._id ||
            (m.senderId &&
              m.senderId === action.message.senderId &&
              m.text === action.message.text)),
      );
      if (optIdx !== -1) {
        const next = state.messages.slice();
        next[optIdx] = action.message;
        return { ...state, messages: next };
      }
      // Deduplicate
      if (state.messages.some((m) => m._id === action.message._id)) return state;
      return {
        ...state,
        messages: insertChronological(state.messages, action.message),
      };
    }

    case 'RECEIPTS_UPDATE': {
      const next = markMessagesRead(state.messages, action.messageIds);
      return next === state.messages ? state : { ...state, messages: next };
    }

    case 'MESSAGE_DELETED':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m._id === action.messageId
            ? { ...m, text: 'This message was deleted', contentType: 'system' as const }
            : m,
        ),
      };

    default:
      return state;
  }
};
