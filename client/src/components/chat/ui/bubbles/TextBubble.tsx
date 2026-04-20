import React, { memo, useMemo } from 'react';
import { MessageText } from '../MessageText.js';
import { ReplyPreview } from '../ReplyPreview.js';
import type { ChatMessage } from '../../types.js';

interface TextBubbleProps {
  msg:              ChatMessage;
  isOwn:            boolean;
  isSameGroupPrev:  boolean;
  showDateSeparator: boolean;
  isFailed:         boolean;
  onJumpToMessage?: (messageId: string) => void;
}

/**
 * Heuristic: very short mostly-non-alphanumeric text ("ok", "lol", "👀..")
 * reads better centered inside the bubble. We treat strings of 3 or fewer
 * characters as candidates and then require that the majority of those chars
 * are symbols/whitespace/emoji (i.e. not word characters).
 */
const isShortSymbolic = (text: string): boolean => {
  const t = text.trim();
  if (!t || t.length > 3) return false;
  const wordChars = t.match(/[A-Za-z0-9]/g)?.length ?? 0;
  return wordChars <= Math.floor(t.length / 2);
};

/**
 * Standard bubble — rich text with linkify, mentions, social chips. Mirrors
 * the original `MessageBubble` content block so backward-compat is trivial
 * for any message with `contentType === 'text'` (or the implicit legacy
 * default on old DB rows).
 */
export const TextBubble = memo(({
  msg,
  isOwn,
  isSameGroupPrev,
  showDateSeparator,
  isFailed,
  onJumpToMessage,
}: TextBubbleProps) => {
  const short = useMemo(() => isShortSymbolic(msg.text), [msg.text]);

  return (
    <div
      className={`relative min-w-0 overflow-hidden px-3.5 py-2.5 text-[12px] leading-snug break-words [overflow-wrap:anywhere] [&_a]:break-all transition-transform duration-200 ${
        isOwn ? 'hover:-translate-y-0.5' : ''
      } ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-2xl rounded-br-md shadow-2xl shadow-indigo-900/50 ring-1 ring-inset ring-white/[0.15]'
          : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] text-gray-200 rounded-2xl rounded-bl-md backdrop-blur-2xl shadow-lg shadow-black/20'
      } ${
        isSameGroupPrev && !showDateSeparator
          ? isOwn ? 'rounded-tr-md' : 'rounded-tl-md'
          : ''
      } ${isFailed ? 'ring-2 ring-red-500/50' : ''} ${short ? 'text-center' : ''}`}
    >
      {msg.replyTo && (
        <ReplyPreview
          senderName={msg.replyTo.senderName}
          text={msg.replyTo.text}
          isOwn={isOwn}
          onClick={onJumpToMessage ? () => onJumpToMessage(msg.replyTo!.messageId) : undefined}
        />
      )}
      <MessageText text={msg.text} isOwn={isOwn} />
    </div>
  );
});

TextBubble.displayName = 'TextBubble';
