import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore.js';
import { chatApi } from '../../../services/api/chat.api.js';
import { setGuestSocketAuth } from '../../../services/socket/connection.js';
import {
  useConversations,
  useChatMessages,
  useChatUnreadCounts,
  useTypingIndicator,
  useChatScroll,
  useConversationFilters,
} from '../hooks/index.js';
import type {
  ConversationFiltersState,
  ConversationTypeFilter,
  ConversationSortBy,
  ConversationSortOrder,
} from '../hooks/useConversationFilters.js';
import type { Conversation, ChatMessage } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const afterPaint = (fn: () => void) => {
  requestAnimationFrame(() => requestAnimationFrame(fn));
};

// ── Context Value ────────────────────────────────────────────────────────────

interface ChatContextValue {
  // Conversations
  conversations:         Conversation[];
  selectedConversation:  Conversation | null;
  selectConversation:    (conv: Conversation | null) => void;
  createDirectChat:      (userId: string) => Promise<Conversation | null>;
  createGroupChat:       (participantIds: string[], title: string, publicName?: string) => Promise<Conversation | null>;
  refreshConversations:  () => void;
  conversationsLoading:  boolean;
  hasMoreConversations:  boolean;
  loadMoreConversations: () => void;

  // Conversation filters
  conversationFilters:       ConversationFiltersState;
  conversationFiltersDirty:  boolean;
  setConversationFilterQ:          (q: string) => void;
  setConversationFilterType:       (t: ConversationTypeFilter | null) => void;
  setConversationFilterUnreadOnly: (v: boolean) => void;
  setConversationFilterSortBy:     (s: ConversationSortBy) => void;
  setConversationFilterSortOrder:  (o: ConversationSortOrder) => void;
  resetConversationFilters:        () => void;

  // Messages
  messages:          ChatMessage[];
  messagesLoading:   boolean;
  initialLoading:    boolean;
  hasBefore:          boolean;
  hasAfter:          boolean;
  beforeCursor:       string | null;
  afterCursor:       string | null;
  loadBeforeMessages: (cursor: string) => Promise<void>;
  loadAfterMessages: (cursor: string) => Promise<void>;
  sendMessage:       (text: string, replyTo?: ChatMessage) => Promise<void>;
  retryMessage:      (messageId: string) => Promise<void>;
  deleteMessage:     (messageId: string) => Promise<void>;

  // Scroll
  scroll:            ReturnType<typeof useChatScroll>;
  scrollToMessage:   (messageId: string) => Promise<void>;

  // Unread
  unreadCounts:      Record<string, number>;
  totalUnread:       number;
  clearConversationUnread: (conversationId: string) => void;

  // Last-read anchor (for "unread messages" divider in MessageThread)
  lastReadMessageId: string | null;

  // Typing
  typingUsers:   Array<{ userId: string; name: string }>;
  sendTyping:    () => void;
  sendStopTyping: () => void;

  // Reply
  replyingTo:    ChatMessage | null;
  setReplyingTo: (msg: ChatMessage | null) => void;

  // Search / new chat
  showNewChat:    boolean;
  setShowNewChat: (v: boolean) => void;

  // User
  currentUserId?: string;

  // Guest Mode
  guestSession?: { signature: string; expiresAt: string; name: string };
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export const ChatProvider: React.FC<{ 
  children: React.ReactNode;
  guestSession?: { signature: string; expiresAt: string; name: string };
}> = ({ children, guestSession: initialGuestSession }) => {
  const [guestSession, setGuestSession] = useState(initialGuestSession);
  const { user } = useAuthStore();
  const userId = user?.id;

  // URL params for /:role/chat/:conversationId
  const { conversationId: urlConversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive the base chat path from the current URL (e.g. /owner/chat, /user/chat)
  const baseChatPath = useMemo(() => {
    const parts = location.pathname.split('/');
    const chatIdx = parts.indexOf('chat');
    if (chatIdx > 0) return parts.slice(0, chatIdx + 1).join('/');
    return location.pathname;
  }, [location.pathname]);
  
  useEffect(() => {
    if (initialGuestSession && !guestSession) {
      setGuestSession(initialGuestSession);
    }
  }, [initialGuestSession]);

  // Conversation filters (search / type / sort / unread-only).
  const {
    filters:       conversationFilters,
    debouncedFilters,
    setQ:          setConversationFilterQ,
    setType:       setConversationFilterType,
    setUnreadOnly: setConversationFilterUnreadOnly,
    setSortBy:     setConversationFilterSortBy,
    setSortOrder:  setConversationFilterSortOrder,
    reset:         resetConversationFilters,
    isDirty:       conversationFiltersDirty,
  } = useConversationFilters();

  // Memoize the server-side slice so the conversations hook's effect only
  // refetches when the debounced server-facing fields actually change.
  const serverFilters = useMemo(
    () => ({
      q:         debouncedFilters.q,
      type:      debouncedFilters.type,
      sortBy:    debouncedFilters.sortBy,
      sortOrder: debouncedFilters.sortOrder,
    }),
    [debouncedFilters.q, debouncedFilters.type, debouncedFilters.sortBy, debouncedFilters.sortOrder],
  );

  // Conversations
  const {
    conversations,
    setConversations,
    loading: conversationsLoading,
    hasMore: hasMoreConversations,
    loadMore: loadMoreConversations,
    refresh: refreshConversations,
  } = useConversations(userId, serverFilters);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  // Last-read message ID — returned by the server's smart initial load.
  // Used by MessageThread to render the "unread messages" divider.
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);

  // Scroll management
  const scroll = useChatScroll(selectedConversation?._id ?? null);

  // Messages — with incoming callback for auto-scroll.
  // Uses a ref so the callback identity is stable and doesn't cause
  // the socket effect in useChatMessages to reconnect on every render.
  const scrollRef = useRef(scroll);
  scrollRef.current = scroll;

  const onIncoming = useCallback((msg: ChatMessage) => {
    const s = scrollRef.current;
    if (msg.isYou || s.nearBottomRef.current) {
      requestAnimationFrame(() => s.scrollToBottom(true));
    }
  }, []);

  const {
    messages,
    loading: messagesLoading,
    initialLoading,
    hasBefore,
    hasAfter,
    beforeCursor,
    afterCursor,
    loadInitial,
    loadBefore: loadBeforeMessages,
    loadAfter: loadAfterMessages,
    loadAround,
    appendOptimistic,
    confirmOptimistic,
  } = useChatMessages(
    selectedConversation?._id ?? null, 
    userId, 
    onIncoming,
    guestSession
  );

  // Unread counts (for sidebar badges — NOT needed for anchor loading)
  const {
    counts: unreadCounts,
    totalUnread,
    clearConversation: clearConversationUnread,
  } = useChatUnreadCounts(userId);

  // Sync guest socket auth whenever it changes
  useEffect(() => {
    if (guestSession && urlConversationId) {
      setGuestSocketAuth({
        signature:      guestSession.signature,
        expiresAt:      guestSession.expiresAt,
        conversationId: urlConversationId,
      });
    } else {
      setGuestSocketAuth(null);
    }
  }, [guestSession, urlConversationId]);

  // Typing
  const { typingUsers, sendTyping, sendStopTyping } = useTypingIndicator(
    selectedConversation?._id ?? null,
    userId,
  );

  // ── Auto-select conversation from URL param ──────────────────────────────
  useEffect(() => {
    if (!urlConversationId) {
      setSelectedConversation(null);
      return;
    }

    if (selectedConversation?._id === urlConversationId) return;

    const found = conversations.find((c) => c._id === urlConversationId);
    if (found) {
      setSelectedConversation(found);
      return;
    }

    if (conversations.length > 0 || !conversationsLoading || guestSession) {
      void (async () => {
        try {
          // Use guest API if signature is present
          const { conversation } = guestSession 
            ? await chatApi.getGuestConversation(urlConversationId, guestSession)
            : await chatApi.getConversation(urlConversationId);

          if (conversation) {
            setSelectedConversation(conversation);
            
            // Hydrate guest name if missing
            if (guestSession && !guestSession.name && conversation.externalUser?.name) {
              setGuestSession({ ...guestSession, name: conversation.externalUser.name });
            }

            if (!guestSession) {
              setConversations((prev: Conversation[]) => {
                if (prev.some((c) => c._id === conversation._id)) return prev;
                return [conversation, ...prev];
              });
            }
          }
        } catch {
          if (!guestSession) navigate(baseChatPath, { replace: true });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlConversationId, conversations, conversationsLoading, guestSession]);

  // ── Smart initial load on conversation change ────────────────────────────
  //
  // The server handles anchor detection automatically — it checks the user's
  // ChatReadCursor and returns messages centered on the last-read message if
  // there are unread messages. The response includes `lastReadMessageId` for
  // the divider UI.
  //
  // NO need to wait for unread counts — one round trip handles everything.
  useEffect(() => {
    if (!selectedConversation) {
      setLastReadMessageId(null);
      return;
    }

    loadInitial().then(({ messages: loaded, lastReadMessageId: lastRead }) => {
      setLastReadMessageId(lastRead);

      afterPaint(() => {
        if (lastRead && loaded.some((m) => m._id === lastRead)) {
          // Scroll to the last-read message (instant, not smooth) and highlight it.
          // User lands right at where they left off — unread messages are below.
          const ok = scroll.scrollToMessageEl(lastRead, false);
          if (!ok) scroll.scrollToBottom(false);
        } else {
          // No unread or last-read not in window → go to bottom
          scroll.scrollToBottom(false);
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?._id]);

  // Temp ID counter for optimistic messages
  const tempIdRef = useRef(0);

  const selectConversation = useCallback((conv: Conversation | null) => {
    setSelectedConversation(conv);
    setReplyingTo(null);
    setLastReadMessageId(null);
    if (conv) {
      clearConversationUnread(conv._id);
      navigate(`${baseChatPath}/${conv._id}`, { replace: true });
    } else {
      navigate(baseChatPath, { replace: true });
    }
  }, [clearConversationUnread, navigate, baseChatPath]);

  const createDirectChat = useCallback(async (targetUserId: string): Promise<Conversation | null> => {
    try {
      const { conversation } = await chatApi.createConversation({
        type:           'direct',
        participantIds: [targetUserId],
      });
      refreshConversations();
      navigate(`${baseChatPath}/${conversation._id}`, { replace: true });
      setSelectedConversation(conversation);
      return conversation;
    } catch (e) {
      console.error('[ChatContext] createDirectChat failed:', e);
      return null;
    }
  }, [refreshConversations, navigate, baseChatPath]);

  const createGroupChat = useCallback(async (
    participantIds: string[],
    title: string,
    publicName?: string,
  ): Promise<Conversation | null> => {
    try {
      const trimmed = publicName?.trim();
      const { conversation } = await chatApi.createConversation({
        type: 'group',
        participantIds,
        title,
        ...(trimmed ? { publicName: trimmed } : {}),
      });
      refreshConversations();
      navigate(`${baseChatPath}/${conversation._id}`, { replace: true });
      setSelectedConversation(conversation);
      return conversation;
    } catch (e) {
      console.error('[ChatContext] createGroupChat failed:', e);
      return null;
    }
  }, [refreshConversations, navigate, baseChatPath]);

  /**
   * Fire the network send for an already-optimistic message and reconcile
   * on success/failure. Factored out so both `sendMessage` (first attempt)
   * and `retryMessage` (manual retry from the failed tick) go through the
   * same code path — no duplicated body-building or error handling.
   */
  const dispatchSend = useCallback(async (optimistic: ChatMessage) => {
    const body = {
      text: optimistic.text,
      ...(optimistic.replyTo && {
        replyTo: {
          messageId:  optimistic.replyTo.messageId,
          senderName: optimistic.replyTo.senderName,
          text:       optimistic.replyTo.text,
        },
      }),
    };

    try {
      const { message } = guestSession
        ? await chatApi.sendGuestMessage(optimistic.conversationId, body, guestSession)
        : await chatApi.sendMessage(optimistic.conversationId, body);
      confirmOptimistic(optimistic._id, { ...message, isYou: true, deliveryStatus: 'sent' });
    } catch (e) {
      console.error('[ChatContext] dispatchSend failed:', e);
      confirmOptimistic(optimistic._id, { ...optimistic, _status: 'failed' });
    }
  }, [confirmOptimistic, guestSession]);

  const sendMessage = useCallback(async (text: string, replyTo?: ChatMessage) => {
    if (!selectedConversation) return;

    // We need either a logged-in user OR a guest session
    if (!user && !guestSession) return;

    const tempId = `temp-${++tempIdRef.current}-${Date.now()}`;
    const optimistic: ChatMessage = {
      _id:            tempId,
      conversationId: selectedConversation._id,
      senderId:       user?.id ?? null,
      senderName:     user?.name ?? guestSession?.name ?? 'Guest',
      messageType:    'text',
      text,
      attachments:    [],
      isSystem:       false,
      isYou:          true,
      deliveryStatus: 'sent',
      _status:        'sending',
      createdAt:      new Date().toISOString(),
      ...(replyTo && {
        replyTo: {
          messageId:  replyTo._id,
          senderName: replyTo.senderName,
          text:       replyTo.text.slice(0, 200),
        },
      }),
    };

    appendOptimistic(optimistic);
    setReplyingTo(null);
    sendStopTyping();
    // Clear the unread divider — user is now at the bottom
    setLastReadMessageId(null);
    // User sent a message → scroll to bottom
    requestAnimationFrame(() => scroll.scrollToBottom(true));

    await dispatchSend(optimistic);
  }, [selectedConversation, user, appendOptimistic, dispatchSend, sendStopTyping, scroll, guestSession]);

  /**
   * Re-send a previously-failed optimistic message. The retry replaces the
   * red "Failed" tick with a "Sending" spinner immediately, using the same
   * tempId so the list doesn't reorder.
   */
  const retryMessage = useCallback(async (messageId: string) => {
    const failed = messages.find((m) => m._id === messageId && m._status === 'failed');
    if (!failed) return;

    const retrying: ChatMessage = { ...failed, _status: 'sending' };
    confirmOptimistic(messageId, retrying);
    await dispatchSend(retrying);
  }, [messages, confirmOptimistic, dispatchSend]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!selectedConversation) return;
    try {
      if (guestSession) {
        await chatApi.deleteGuestMessage(selectedConversation._id, messageId, guestSession);
      } else {
        await chatApi.deleteMessage(selectedConversation._id, messageId);
      }
    } catch (e) {
      console.error('[ChatContext] deleteMessage failed:', e);
    }
  }, [selectedConversation, guestSession]);

  /**
   * Jump to a specific message — if it's in the current window, just scroll.
   * If not, load a window centered on it (loadAround), then scroll after paint.
   */
  const scrollToMessage = useCallback(async (messageId: string) => {
    if (!selectedConversation) return;

    // Already in the loaded window?
    if (messages.some((m) => m._id === messageId)) {
      scroll.scrollToMessageEl(messageId);
      return;
    }

    // Not in window → fetch around that message
    await loadAround(messageId);
    afterPaint(() => scroll.scrollToMessageEl(messageId));
  }, [selectedConversation, messages, scroll, loadAround]);

  const value = useMemo<ChatContextValue>(() => ({
    conversations,
    selectedConversation,
    selectConversation,
    createDirectChat,
    createGroupChat,
    refreshConversations,
    conversationsLoading,
    hasMoreConversations,
    loadMoreConversations,
    conversationFilters,
    conversationFiltersDirty,
    setConversationFilterQ,
    setConversationFilterType,
    setConversationFilterUnreadOnly,
    setConversationFilterSortBy,
    setConversationFilterSortOrder,
    resetConversationFilters,
    messages,
    messagesLoading,
    initialLoading,
    hasBefore,
    hasAfter,
    beforeCursor,
    afterCursor,
    loadBeforeMessages,
    loadAfterMessages,
    sendMessage,
    retryMessage,
    deleteMessage,
    scroll,
    scrollToMessage,
    unreadCounts,
    totalUnread,
    clearConversationUnread,
    lastReadMessageId,
    typingUsers,
    sendTyping,
    sendStopTyping,
    replyingTo,
    setReplyingTo,
    showNewChat,
    setShowNewChat,
    currentUserId: userId,
    guestSession,
  }), [
    conversations, selectedConversation, selectConversation,
    createDirectChat, createGroupChat, refreshConversations,
    conversationsLoading, hasMoreConversations, loadMoreConversations,
    conversationFilters, conversationFiltersDirty,
    setConversationFilterQ, setConversationFilterType, setConversationFilterUnreadOnly,
    setConversationFilterSortBy, setConversationFilterSortOrder, resetConversationFilters,
    messages, messagesLoading, initialLoading, hasBefore, hasAfter, beforeCursor, afterCursor,
    loadBeforeMessages, loadAfterMessages, sendMessage, retryMessage, deleteMessage,
    scroll, scrollToMessage,
    unreadCounts, totalUnread, clearConversationUnread,
    lastReadMessageId,
    typingUsers, sendTyping, sendStopTyping,
    replyingTo, showNewChat, userId, guestSession
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
