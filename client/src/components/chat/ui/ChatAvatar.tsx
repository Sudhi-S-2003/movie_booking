import React, { memo } from 'react';
import type { Conversation, ChatParticipant } from '../types.js';

interface ChatAvatarProps {
  conversation?: Conversation;
  participant?:  ChatParticipant;
  size?:         'sm' | 'md' | 'lg';
  /**
   * Kept in the prop type for call-site backward compatibility. The
   * server-side `attachDirectPeer` now folds the peer into the
   * conversation's `title` / `avatarUrl`, so the avatar logic no longer
   * needs to know who the viewer is.
   */
  currentUserId?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-base',
} as const;

const GRADIENT_PAIRS = [
  'from-violet-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-600 to-purple-700',
];

const pickGradient = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length]!;
};

export const ChatAvatar = memo(({ conversation, participant, size = 'md' }: ChatAvatarProps) => {
  const cls = SIZE_MAP[size];

  // Single participant avatar
  if (participant) {
    if (participant.avatar) {
      return (
        <img
          src={participant.avatar}
          alt={participant.name}
          className={`${cls} rounded-full object-cover ring-1 ring-white/10`}
        />
      );
    }
    return (
      <div className={`${cls} rounded-full bg-gradient-to-br ${pickGradient(participant._id)} flex items-center justify-center font-bold text-white shadow-sm`}>
        {participant.name[0]?.toUpperCase() ?? '?'}
      </div>
    );
  }

  // Conversation avatar
  if (!conversation) return null;

  if (conversation.type === 'system') {
    return (
      <div className={`${cls} rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white`}>
        <svg className="w-1/2 h-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    );
  }

  // Peer-backed rows (direct 1:1 and api-driven guest chats) carry a
  // `peer` object with the opposite person's identity. Prefer that for the
  // avatar so we don't show "?" when the conversation itself has no title
  // or avatarUrl of its own (api conversations never do — the "other side"
  // is a guest, and direct chats only get the peer enriched at list time).
  if ((conversation.type === 'direct' || conversation.type === 'api') && conversation.peer) {
    const peer = conversation.peer;
    if (peer.avatar) {
      return (
        <img
          src={peer.avatar}
          alt={peer.name}
          className={`${cls} rounded-full object-cover ring-1 ring-white/10`}
        />
      );
    }
    return (
      <div className={`${cls} rounded-full bg-gradient-to-br ${pickGradient(peer._id)} flex items-center justify-center font-bold text-white shadow-sm`}>
        {peer.name[0]?.toUpperCase() ?? '?'}
      </div>
    );
  }

  // Group / system / anything-else: use the conversation's own avatar + title.
  if (conversation.avatarUrl) {
    return (
      <img
        src={conversation.avatarUrl}
        alt={conversation.title ?? 'Chat'}
        className={`${cls} rounded-full object-cover ring-1 ring-white/10`}
      />
    );
  }

  // Fallback: gradient placeholder seeded by the conversation id, with the
  // first letter of the resolved title (or a type-appropriate default).
  const fallbackLetter = (conversation.title?.[0]
    ?? (conversation.type === 'group' ? 'G' : '?')).toUpperCase();

  return (
    <div className={`${cls} rounded-full bg-gradient-to-br ${pickGradient(conversation._id)} flex items-center justify-center font-bold text-white shadow-sm`}>
      {fallbackLetter}
    </div>
  );
});

ChatAvatar.displayName = 'ChatAvatar';
