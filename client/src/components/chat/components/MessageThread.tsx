import React, { memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown } from 'lucide-react';
import { MessageBubble, PaginationShimmer, TypingIndicator } from '../ui/index.js';
import type { UseChatScrollReturn } from '../hooks/useChatScroll.js';
import type { ChatMessage } from '../types.js';
import { useChatPagination } from '../hooks/useChatPagination.js';
import { useChatReadReceipts } from '../hooks/useReadReceipts.js';

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
  onRetry: (messageId: string) => Promise<void>;
  onJumpToMessage: (messageId: string) => Promise<void>;
  guestSession?: { signature: string; expiresAt: string; name: string };
}

/**
 * Virtualized message list.
 *
 * Uses `@tanstack/react-virtual` so only the messages actually in the
 * viewport (+ a small overscan band) are mounted at any given time. A
 * conversation with 1M messages still only renders ~20–40 DOM bubbles.
 *
 * Heights are measured dynamically via `measureElement`, so variable-
 * height bubbles (multi-line text, replies, date separators) stay correct
 * without a fixed row height.
 *
 * Pagination sentinels, typing indicator, and the end-ref anchor live
 * OUTSIDE the virtualized block — they're always in the DOM so their
 * IntersectionObservers fire on scroll past boundaries.
 */
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
  onRetry,
  onJumpToMessage,
  guestSession,
}: MessageThreadProps) => {
  // ── IntersectionObserver pagination (bidirectional) ────────────────────────
  const { loadingBefore, loadingAfter } = useChatPagination({
    conversationId,
    ready: !initialLoading,
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

  // ── Precompute grouping data (pure derivation of messages) ────────────────
  const groupedMessages = useMemo(
    () => buildGroupedMessages(messages, currentUserId, lastReadMessageId),
    [messages, currentUserId, lastReadMessageId],
  );

  // ── Virtualizer ────────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count:            groupedMessages.length,
    getScrollElement: () => scroll.containerRef.current,
    estimateSize:     () => 72,           // rough bubble height; measureElement refines
    overscan:         8,                   // render 8 extra items above/below viewport
    // Keyed so measurements survive list shifts on prepend/append.
    getItemKey:       (index) => groupedMessages[index]?.msg._id ?? String(index),
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize    = virtualizer.getTotalSize();

  // Observe mounted message rows and POST read-receipts for the ones that
  // cross the visibility threshold. Only the subset actually visible gets
  // reported — this is what makes 10K-unread conversations behave correctly.
  useChatReadReceipts(scroll.containerRef, conversationId, currentUserId, messages, guestSession);

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
        {/* Top sentinel — drives older-messages pagination. Kept outside the
            virtualized block so its IntersectionObserver is never detached. */}
        <div ref={scroll.topSentinelRef} className="h-1" />

        {loadingBefore && hasBefore && <PaginationShimmer label="Loading older messages" />}

        {/* Virtualized area.
            The outer div's height reflects the total virtual content so the
            scrollbar is correctly sized; inner absolutely-positioned items
            are translated to their computed offsets. */}
        <div
          style={{
            height:   `${totalSize}px`,
            width:    '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((vi) => {
            const row = groupedMessages[vi.index];
            if (!row) return null;
            const { msg, isOwn, isSameGroupPrev, isSameGroupNext, showDateSeparator, dateLabel, showUnreadDivider } = row;

            return (
              <div
                key={vi.key}
                data-index={vi.index}
                data-msg-id={msg._id}
                ref={virtualizer.measureElement}
                style={{
                  position:  'absolute',
                  top:       0,
                  left:      0,
                  width:     '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
              >
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
                  onRetry={(id) => void onRetry(id)}
                  onJumpToMessage={(id) => void onJumpToMessage(id)}
                />
              </div>
            );
          })}
        </div>

        <TypingIndicator users={typingUsers} />

        {loadingAfter && hasAfter && <PaginationShimmer label="Loading newer messages" />}

        {/* Bottom sentinel + end anchor — also outside the virtualized block. */}
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

interface GroupedRow {
  msg:              ChatMessage;
  isOwn:            boolean;
  isSameGroupPrev:  boolean;
  isSameGroupNext:  boolean;
  showDateSeparator: boolean;
  dateLabel:        string;
  showUnreadDivider: boolean;
}

/**
 * Precompute the static-per-render metadata each row needs — pulled out of
 * the component so React.memo skips re-grouping when props are unchanged.
 */
function buildGroupedMessages(
  messages:          ChatMessage[],
  currentUserId:     string | undefined,
  lastReadMessageId: string | null | undefined,
): GroupedRow[] {
  return messages.map((msg, i) => {
    const prev = i > 0 ? messages[i - 1] : undefined;
    const next = i < messages.length - 1 ? messages[i + 1] : undefined;

    const isOwn   = msg.isYou  ?? (currentUserId ? msg.senderId === currentUserId : false);
    const prevOwn = prev ? (prev.isYou ?? (currentUserId ? prev.senderId === currentUserId : false)) : null;
    const nextOwn = next ? (next.isYou ?? (currentUserId ? next.senderId === currentUserId : false)) : null;

    const isSameGroupPrev = prevOwn === isOwn && prev?.senderId === msg.senderId;
    const isSameGroupNext = nextOwn === isOwn && next?.senderId === msg.senderId;

    const msgDate  = new Date(msg.createdAt).toDateString();
    const prevDate = prev ? new Date(prev.createdAt).toDateString() : null;
    const showDateSeparator = msgDate !== prevDate;

    const dateLabel = formatDateLabel(msg.createdAt);

    const showUnreadDivider =
      !!lastReadMessageId &&
      prev?._id === lastReadMessageId &&
      msg._id !== lastReadMessageId;

    return { msg, isOwn, isSameGroupPrev, isSameGroupNext, showDateSeparator, dateLabel, showUnreadDivider };
  });
}

function formatDateLabel(dateStr: string): string {
  const date      = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString())     return 'Today';
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
