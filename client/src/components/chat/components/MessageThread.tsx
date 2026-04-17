import React, { memo, useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import { MessageBubble, PaginationShimmer, TypingIndicator } from '../ui/index.js';
import type { UseChatScrollReturn } from '../hooks/useChatScroll.js';
import type { ChatMessage } from '../types.js';
import { useChatReadReceipts } from '../hooks/useReadReceipts.js';
import { useChatPagination } from '../hooks/useChatPagination.js';

interface MessageThreadProps {
  messages: ChatMessage[];
  initialLoading: boolean;
  hasBefore: boolean;
  hasAfter: boolean;
  beforeCursor: string | null;
  afterCursor: string | null;
  conversationId: string;
  currentUserId?: string;
  lastReadMessageId?: string | null;
  typingUsers: Array<{ userId: string; name: string }>;
  scroll: UseChatScrollReturn;
  onLoadBefore: (cursor: string) => Promise<void>;
  onLoadAfter: (cursor: string) => Promise<void>;
  onReply: (msg: ChatMessage) => void;
  onDelete: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => Promise<void>;
}

export const MessageThread = memo(({
  messages,
  initialLoading,
  hasBefore,
  hasAfter,
  beforeCursor,
  afterCursor,
  conversationId,
  currentUserId,
  lastReadMessageId,
  typingUsers,
  scroll,
  onLoadBefore,
  onLoadAfter,
  onReply,
  onDelete,
  onJumpToMessage,
}: MessageThreadProps) => {
  // ── Read receipts ─────────────────────────────────────────────────────────
  useChatReadReceipts(scroll.containerRef, conversationId, currentUserId, messages);

  // ── IntersectionObserver pagination (bidirectional) ────────────────────────
  const { loadingBefore, loadingAfter } = useChatPagination({
    conversationId,
    ready: !initialLoading,   // observer must wait until container is in the DOM
    hasBefore,
    hasAfter,
    beforeCursor,
    afterCursor,
    loadBefore: async (cursor) => {
      scroll.saveAnchor();
      await onLoadBefore(cursor);
      scroll.restoreAnchor();
    },
    loadAfter: onLoadAfter,
    containerRef: scroll.containerRef,
    topSentinelRef: scroll.topSentinelRef,
    bottomSentinelRef: scroll.bottomSentinelRef,
  });

  // ── Precompute grouping data ──────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = i > 0 ? messages[i - 1] : undefined;
      const next = i < messages.length - 1 ? messages[i + 1] : undefined;

      const isOwn = msg.isYou ?? (currentUserId ? msg.senderId === currentUserId : false);
      const prevOwn = prev ? (prev.isYou ?? (currentUserId ? prev.senderId === currentUserId : false)) : null;
      const nextOwn = next ? (next.isYou ?? (currentUserId ? next.senderId === currentUserId : false)) : null;

      const isSameGroupPrev = prevOwn === isOwn && prev?.senderId === msg.senderId;
      const isSameGroupNext = nextOwn === isOwn && next?.senderId === msg.senderId;

      const msgDate = new Date(msg.createdAt).toDateString();
      const prevDate = prev ? new Date(prev.createdAt).toDateString() : null;
      const showDateSeparator = msgDate !== prevDate;

      const dateLabel = formatDateLabel(msg.createdAt);

      const showUnreadDivider =
        !!lastReadMessageId &&
        prev?._id === lastReadMessageId &&
        msg._id !== lastReadMessageId;

      return { msg, isOwn, isSameGroupPrev, isSameGroupNext, showDateSeparator, dateLabel, showUnreadDivider };
    });
  }, [messages, currentUserId, lastReadMessageId]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scroll.containerRef}
        className="h-full overflow-y-auto custom-scrollbar px-4 py-2"
      >
        {/* Top sentinel for loading older messages (scroll up) */}
        <div ref={scroll.topSentinelRef} className="h-1" />

        {/* Older-messages loading indicator */}
        {loadingBefore && hasBefore && <PaginationShimmer label="Loading older messages" />}

        {/* Messages */}
        {groupedMessages.map(({ msg, isOwn, isSameGroupPrev, isSameGroupNext, showDateSeparator, dateLabel, showUnreadDivider }) => (
          <React.Fragment key={msg._id}>
            {showUnreadDivider && <UnreadDivider />}

            <MessageBubble
              msg={msg}
              isOwn={isOwn}
              isSameGroupPrev={isSameGroupPrev}
              isSameGroupNext={isSameGroupNext}
              showDateSeparator={showDateSeparator}
              dateLabel={dateLabel}
              isHighlighted={scroll.highlightedId === msg._id}
              onReply={onReply}
              onDelete={onDelete}
              onJumpToMessage={(id) => void onJumpToMessage(id)}
            />
          </React.Fragment>
        ))}

        {/* Typing indicator */}
        <TypingIndicator users={typingUsers} />

        {/* Newer-messages loading indicator */}
        {loadingAfter && hasAfter && <PaginationShimmer label="Loading newer messages" />}

        {/* Bottom sentinel for loading newer messages (scroll down) + anchor */}
        <div ref={scroll.bottomSentinelRef} className="h-1" />
        <div ref={scroll.endRef} />
      </div>

      {/* Scroll-to-bottom FAB */}
      {scroll.showScrollBtn && (
        <button
          onClick={() => scroll.scrollToBottom(true)}
          className="absolute bottom-4 right-4 z-10 w-9 h-9 rounded-full
                     bg-white/10 backdrop-blur-md border border-white/[0.08]
                     flex items-center justify-center text-white/60
                     hover:bg-white/20 hover:text-white transition-all
                     shadow-lg shadow-black/30"
          title="Scroll to bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
});

MessageThread.displayName = 'MessageThread';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

// ── Unread Messages Divider ──────────────────────────────────────────────────

const UnreadDivider: React.FC = () => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-accent-blue/40" />
    <span className="text-[9px] font-bold text-accent-blue uppercase tracking-[0.15em] px-3 py-1">
      Unread messages
    </span>
    <div className="flex-1 h-px bg-accent-blue/40" />
  </div>
);
