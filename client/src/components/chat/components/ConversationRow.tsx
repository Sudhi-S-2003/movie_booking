import { memo } from 'react';
import { ChatAvatar } from '../ui/ChatAvatar.js';
import { useChat } from '../context/ChatContext.js';
import { PREVIEW_MAX_LENGTH } from '../constants.js';
import type { Conversation } from '../types.js';

interface ConversationRowProps {
  conversation: Conversation;
  isSelected:   boolean;
  unreadCount:  number;
  onSelect:     () => void;
}

export const ConversationRow = memo(({
  conversation,
  isSelected,
  unreadCount,
  onSelect,
}: ConversationRowProps) => {
  const { currentUserId } = useChat();

  // Server already resolves the display name for every row type:
  //   • direct → opposite participant's name (computed in `attachDirectPeer`)
  //   • group  → saved group title
  //   • system → saved notification title
  const displayName = conversation.title
    ?? (conversation.type === 'system' ? 'Notification' : 'Chat');

  const preview = conversation.lastMessageText
    ? conversation.lastMessageText.slice(0, PREVIEW_MAX_LENGTH)
    : 'No messages yet';

  const timeLabel = conversation.lastMessageAt
    ? formatRelativeTime(conversation.lastMessageAt)
    : '';

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 text-left transition-all hover:bg-white/[0.04] ${
        isSelected
          ? 'bg-white/[0.06] border-l-2 border-accent-blue'
          : 'border-l-2 border-transparent'
      }`}
    >
      <ChatAvatar conversation={conversation} currentUserId={currentUserId} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-bold truncate ${
            unreadCount > 0 ? 'text-white' : 'text-white/80'
          }`}>
            {displayName}
          </span>
          <span className={`text-[8px] flex-shrink-0 tabular-nums ${
            unreadCount > 0 ? 'text-accent-blue font-bold' : 'text-white/20'
          }`}>
            {timeLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-[10px] truncate line-clamp-1 ${
            unreadCount > 0 ? 'text-white/50 font-medium' : 'text-white/25'
          }`}>
            {conversation.lastMessageSender && conversation.type !== 'direct' && (
              <span className="text-white/30">{conversation.lastMessageSender}: </span>
            )}
            {preview}
          </p>

          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-accent-blue rounded-full flex items-center justify-center text-[8px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

ConversationRow.displayName = 'ConversationRow';

// ── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const d   = new Date(dateStr).getTime();
  const diff = now - d;

  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)   return 'now';
  if (mins < 60)  return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)   return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
