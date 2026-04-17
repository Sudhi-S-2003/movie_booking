import React, { memo } from 'react';
import { Reply } from 'lucide-react';

interface ReplyPreviewProps {
  senderName: string;
  text:       string;
  isOwn?:     boolean;
  compact?:   boolean;
  onClick?:   () => void;
}

export const ReplyPreview = memo(({ senderName, text, isOwn, compact, onClick }: ReplyPreviewProps) => {
  const isClickable = !!onClick;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`mb-1.5 pl-2.5 border-l-2 flex items-start gap-1.5 ${
        isOwn ? 'border-white/30' : 'border-accent-blue/50'
      } ${compact ? 'py-0.5' : 'py-1'} ${
        isClickable
          ? 'cursor-pointer hover:bg-white/[0.06] rounded-r transition-colors'
          : ''
      }`}
    >
      {isClickable && (
        <Reply size={10} className={`mt-0.5 flex-shrink-0 ${isOwn ? 'text-white/40' : 'text-accent-blue/40'}`} />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[9px] font-bold ${isOwn ? 'text-white/60' : 'text-accent-blue/70'}`}>
          {senderName}
        </p>
        <p className={`text-[10px] ${isOwn ? 'text-white/40' : 'text-white/30'} line-clamp-1`}>
          {text}
        </p>
      </div>
    </div>
  );
});

ReplyPreview.displayName = 'ReplyPreview';
