import React, { memo, useMemo } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatAvatar } from '../ui/ChatAvatar.js';
import { useAuthStore } from '../../../store/authStore.js';
import type { Conversation } from '../types.js';

interface ChatHeaderProps {
  conversation:  Conversation;
  currentUserId?: string;
  typingUsers:   Array<{ userId: string; name: string }>;
  onBack:        () => void;
}

export const ChatHeader = memo(({
  conversation,
  currentUserId,
  typingUsers,
  onBack,
}: ChatHeaderProps) => {
  // For direct chats, prefer the lightweight `peer` handle attached by the
  // list endpoint; fall back to scanning `participants` when the detail
  // endpoint hydrated it instead. Groups/system rows use the stored title.
  const directPeer = useMemo(() => {
    if (conversation.type !== 'direct') return null;
    if (conversation.peer) return conversation.peer;
    return null;
  }, [conversation, currentUserId]);

  const displayName = useMemo(() => {
    if (conversation.type === 'system') return conversation.title ?? 'Notification';
    if (conversation.type === 'group')  return conversation.title ?? 'Group Chat';
    return directPeer?.name ?? conversation.title ?? 'Chat';
  }, [conversation, directPeer]);

  const subtitle = useMemo(() => {
    if (typingUsers.length > 0) {
      return typingUsers.length === 1
        ? `${typingUsers[0]!.name} is typing...`
        : 'Several people typing...';
    }
    if (conversation.type === 'group')  return `${conversation.participantCount} members`;
    if (conversation.type === 'system') return 'System notifications';
    return directPeer ? `@${directPeer.username}` : '';
  }, [conversation, directPeer, typingUsers]);

  const isSystem = conversation.type === 'system';
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const membersPath = useMemo(() => {
    const role = (user?.role ?? 'user').toString().toLowerCase();
    const prefix = role === 'admin' ? '/admin'
      : role === 'theatre_owner' ? '/owner'
      : '/user';
    return `${prefix}/chat/${conversation._id}/members`;
  }, [user, conversation._id]);

  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      {/* Back button (mobile) */}
      <button
        onClick={onBack}
        className="lg:hidden w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
      >
        <ArrowLeft size={14} />
      </button>

      <ChatAvatar conversation={conversation} currentUserId={currentUserId} size="md" />

      <div className="flex-1 min-w-0">
        <h3 className="text-[12px] font-bold text-white truncate">
          {displayName}
        </h3>
        <p className={`text-[9px] font-medium truncate ${
          typingUsers.length > 0 ? 'text-accent-blue' : 'text-white/30'
        }`}>
          {subtitle}
        </p>
      </div>

      {/* Action buttons */}
      {!isSystem && (
        <div className="flex items-center gap-1">
          {conversation.type === 'group' && (
            <button
              onClick={() => navigate(membersPath)}
              title="View members"
              className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-all"
            >
              <Users size={15} />
            </button>
          )}
          <button className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <Phone size={15} />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <Video size={15} />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <MoreVertical size={15} />
          </button>
        </div>
      )}
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';
