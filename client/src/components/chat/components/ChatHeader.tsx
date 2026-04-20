import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Users, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatAvatar } from '../ui/ChatAvatar.js';
import { TokenUsageBadge } from './TokenUsageBadge.js';
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
    if (conversation.type !== 'direct' && conversation.type !== 'api') return null;
    if (conversation.peer) return conversation.peer;
    return null;
  }, [conversation]);

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
  const location = useLocation();
  const { user } = useAuthStore();

  /**
   * Base chat path for the current role — drops the `:conversationId`
   * segment. Example: `/owner/chat/69e…` → `/owner/chat`.
   * Used for the "Close chat" menu action.
   */
  const chatBasePath = useMemo(() => {
    const parts = location.pathname.split('/');
    const chatIdx = parts.indexOf('chat');
    if (chatIdx > 0) return parts.slice(0, chatIdx + 1).join('/');
    return '/chat';
  }, [location.pathname]);

  const membersPath = useMemo(() => {
    const role = (user?.role ?? 'user').toString().toLowerCase();
    const prefix = role === 'admin' ? '/admin'
      : role === 'theatre_owner' ? '/owner'
      : '/user';
    return `${prefix}/chat/${conversation._id}/members`;
  }, [user, conversation._id]);

  // ── 3-dot menu ────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown',   onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown',   onKey);
    };
  }, [menuOpen]);

  const handleCloseChat = () => {
    setMenuOpen(false);
    navigate(chatBasePath);
  };

  return (
    <div
      className="relative z-30 flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
    >
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

      {/* Token usage pill — visible on all chat types; hidden on guest views */}
      <TokenUsageBadge />

      {/* Action buttons */}
      {!isSystem && (
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {conversation.type === 'group' && (
            <button
              onClick={() => navigate(membersPath)}
              title="View members"
              className="hidden sm:flex w-8 h-8 rounded-lg hover:bg-white/[0.06] items-center justify-center text-white/30 hover:text-white/60 transition-all"
            >
              <Users size={15} />
            </button>
          )}
          {/* Phone/Video hidden on XS (≤380px) to leave room for the token pill */}
          <button className="hidden min-[381px]:flex w-8 h-8 rounded-lg hover:bg-white/[0.06] items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <Phone size={15} />
          </button>
          <button className="hidden min-[381px]:flex w-8 h-8 rounded-lg hover:bg-white/[0.06] items-center justify-center text-white/30 hover:text-white/60 transition-all">
            <Video size={15} />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More actions"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                menuOpen
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
              }`}
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-2xl bg-[#0b0b0e] border border-white/[0.1] shadow-2xl shadow-black/70 overflow-hidden z-[55]"
              >
                {/* Header strip — tells the user what this menu is about. */}
                <div className="px-4 pt-3 pb-2">
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
                    Conversation
                  </span>
                  <p className="mt-0.5 text-[11px] font-bold text-white/70 truncate">
                    {displayName}
                  </p>
                </div>

                <div className="h-px bg-white/[0.06] mx-2" />

                {/* Actions */}
                <div className="p-1.5">
                  <MenuAction
                    icon={<X size={14} />}
                    label="Close chat"
                    hint="Go back to the conversation list"
                    onClick={handleCloseChat}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';

// ── Menu row ────────────────────────────────────────────────────────────────

/**
 * Single row inside the 3-dot menu. Two-line layout so each action has room
 * to explain what it actually does — much friendlier than a bare verb.
 */
const MenuAction = ({
  icon, label, hint, onClick, tone = 'default',
}: {
  icon:   React.ReactNode;
  label:  string;
  hint?:  string;
  onClick: () => void;
  tone?:  'default' | 'danger';
}) => (
  <button
    role="menuitem"
    type="button"
    onClick={onClick}
    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
      tone === 'danger'
        ? 'hover:bg-rose-500/10 text-rose-200 hover:text-rose-100'
        : 'hover:bg-white/[0.06] text-white/80 hover:text-white'
    }`}
  >
    <span className={`mt-0.5 shrink-0 ${tone === 'danger' ? 'text-rose-300' : 'text-white/40'}`}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[12px] font-black">{label}</span>
      {hint && (
        <span className="block text-[10px] font-medium text-white/40 mt-0.5">
          {hint}
        </span>
      )}
    </span>
  </button>
);
