
import type { IssueMessage } from "../types.js";
import {
  mergePage,
  applySlidingWindow,
  reconcileOptimistic,
  insertChronological,
  markMessagesRead,
} from "./messageHelpers.js";

export interface MessagesState {
  messages: IssueMessage[];
  hasBefore: boolean;
  hasAfter: boolean;
  beforeCursor: string | null;
  afterCursor: string | null;
  initialLoading: boolean;
  loading: boolean;
  issueId: string | null;
}

export const initialState: MessagesState = {
  messages: [],
  hasBefore: false,
  hasAfter: false,
  beforeCursor: null,
  afterCursor: null,
  initialLoading: false,
  loading: false,
  issueId: null,
};

export type WindowLoadMode = "replace" | "prepend" | "append";

export type MessagesAction =
  | { type: "RESET"; issueId: string | null }
  | { type: "FETCH_START"; isInitial: boolean }
  | { type: "FETCH_END" }
  | {
      type: "WINDOW_LOADED";
      mode: WindowLoadMode;
      messages: IssueMessage[];
      hasBefore: boolean;
      hasAfter: boolean;
      beforeCursor: string | null;
      afterCursor: string | null;
    }
  | { type: "APPEND_OPTIMISTIC"; message: IssueMessage }
  | { type: "CONFIRM_OPTIMISTIC"; tempId: string; confirmed: IssueMessage }
  | { type: "REMOVE_MESSAGE"; messageId: string }
  | { type: "SOCKET_NEW";    message: IssueMessage }
  | { type: "RECEIPTS_UPDATE"; messageIds: string[] }
  | { type: "MESSAGE_DELETED"; messageId: string };

export function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case "RESET":
      return { ...initialState, issueId: action.issueId };

    case "FETCH_START":
      return {
        ...state,
        loading: true,
        initialLoading: action.isInitial ? true : state.initialLoading,
      };

    case "FETCH_END":
      return { ...state, loading: false, initialLoading: false };

    case "WINDOW_LOADED": {
      if (action.mode === "replace") {
        const { list } = applySlidingWindow(action.messages, "none");
        return {
          ...state,
          messages: list,
          hasBefore: action.hasBefore,
          hasAfter: action.hasAfter,
          beforeCursor: action.beforeCursor,
          afterCursor: action.afterCursor,
          loading: false,
          initialLoading: false,
        };
      }

      const merged = mergePage(
        state.messages,
        action.messages,
        action.mode === "prepend" ? "prepend" : "append",
      );
      const grewFrom = action.mode === "prepend" ? "top" : "bottom";
      const { list, trimmedOther } = applySlidingWindow(merged, grewFrom);

      let beforeCursor = action.mode === "prepend" ? action.beforeCursor : state.beforeCursor;
      let afterCursor = action.mode === "append"  ? action.afterCursor : state.afterCursor;

      if (trimmedOther && list.length > 0) {
        if (grewFrom === "top") {
          const last = list[list.length - 1]!;
          afterCursor = `${new Date(last.createdAt).toISOString()}_${last._id}`;
        } else {
          const first = list[0]!;
          beforeCursor = `${new Date(first.createdAt).toISOString()}_${first._id}`;
        }
      }

      return {
        ...state,
        messages: list,
        hasBefore: action.mode === "prepend"
          ? action.hasBefore
          : state.hasBefore || trimmedOther,
        hasAfter: action.mode === "append"
          ? action.hasAfter
          : state.hasAfter || trimmedOther,
        beforeCursor,
        afterCursor,
        loading: false,
      };
    }

    case "APPEND_OPTIMISTIC": {
      const exists = state.messages.some(
        (m) => m._id === action.message._id && !m._status,
      );
      if (exists) return state;
      return { ...state, messages: [...state.messages, action.message] };
    }

    case "CONFIRM_OPTIMISTIC":
      return {
        ...state,
        messages: reconcileOptimistic(state.messages, action.tempId, action.confirmed),
      };

    case "REMOVE_MESSAGE":
      return {
        ...state,
        messages: state.messages.filter((m) => m._id !== action.messageId),
      };

    case "MESSAGE_DELETED":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m._id === action.messageId
            ? { ...m, text: "This message was deleted" }
            : m,
        ),
      };

    case "SOCKET_NEW": {
      const optIdx = state.messages.findIndex(
        (m) =>
          m._status === "sending" &&
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
      if (state.messages.some((m) => m._id === action.message._id)) return state;
      return { ...state, messages: insertChronological(state.messages, action.message) };
    }

    case "RECEIPTS_UPDATE": {
      const next = markMessagesRead(state.messages, action.messageIds);
      return next === state.messages ? state : { ...state, messages: next };
    }

    default:
      return state;
  }
}
