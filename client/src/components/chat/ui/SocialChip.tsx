import React from 'react';
import * as LucideIcons from 'lucide-react';
import { getSocialMeta } from '../../../utils/social-resolver.js';

interface SocialChipProps {
  mention: string;
  isOwn?: boolean;
}

export const SocialChip: React.FC<SocialChipProps> = ({ mention, isOwn }) => {
  const meta = getSocialMeta(mention);
  if (!meta) return <span className="opacity-60">{mention}</span>;

  const Icon = (LucideIcons as any)[meta.iconName] || LucideIcons.Globe;

  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-[10px] font-semibold no-underline transition-all duration-150 ${
        isOwn
          ? 'bg-black/20 hover:bg-black/30 text-white/95 ring-1 ring-inset ring-white/10'
          : 'hover:bg-white/[0.12] border border-white/[0.08]'
      }`}
      style={!isOwn ? { color: meta.color, backgroundColor: `${meta.color}10` } : undefined}
    >
      <Icon size={10} strokeWidth={2.5} className={isOwn ? 'text-violet-200 opacity-80' : ''} style={!isOwn ? { color: meta.color } : undefined} />
      <span className="tracking-tight">{meta.displayName}</span>
      <span className={isOwn ? 'text-white/50' : 'text-white/35'}>/{meta.username}</span>
    </a>
  );
};
