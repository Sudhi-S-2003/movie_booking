import React, { memo } from 'react';
import { Users } from 'lucide-react';
import type { PublicChatSummary } from '../../services/api/chat.api.js';

interface PublicChatCardProps {
  conversation: PublicChatSummary;
  children:     React.ReactNode;
}

/**
 * Shared presentation shell for public-facing chat pages (social resolver
 * and invite preview). Renders the avatar, title, slug, member count and
 * slots the page-specific CTA below.
 */
export const PublicChatCard = memo(({ conversation, children }: PublicChatCardProps) => {
  const initial = (conversation.title?.[0] ?? 'G').toUpperCase();

  return (
    <div className="max-w-lg w-full bg-white/[0.02] border border-white/5 rounded-[40px] shadow-2xl backdrop-blur-3xl overflow-hidden">
      <div className="px-10 pt-12 pb-8 flex flex-col items-center text-center gap-4">
        {conversation.avatarUrl ? (
          <img
            src={conversation.avatarUrl}
            alt={conversation.title ?? 'Group'}
            className="w-24 h-24 rounded-3xl object-cover ring-1 ring-white/10 shadow-xl"
          />
        ) : (
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/30 to-accent-blue/30 flex items-center justify-center text-white font-black text-3xl shadow-xl border border-white/10">
            {initial}
          </div>
        )}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-tight text-white">
            {conversation.title ?? 'Untitled Group'}
          </h1>
          {conversation.publicName && (
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400/80">
              @{conversation.publicName}
            </p>
          )}
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <Users size={11} /> {conversation.participantCount} members
        </div>
      </div>
      <div className="px-10 py-6 border-t border-white/5 bg-white/[0.015]">
        {children}
      </div>
    </div>
  );
});

PublicChatCard.displayName = 'PublicChatCard';
