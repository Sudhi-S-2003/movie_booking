import { memo } from 'react';
import { Calendar } from 'lucide-react';
import type { ChatMessage } from '../../types.js';

interface DateBubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
}

const WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', timeZone: 'UTC',
});
const DATE_NO_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', timeZone: 'UTC',
});
const DATE_WITH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

/**
 * Compact date card.
 * Fixes: Added responsive text sizing, aggressive word breaking, 
 * and fixed bubble rounding for grouped messages.
 */
export const DateBubble = memo(({ msg, isOwn }: DateBubbleProps) => {
  const d = msg.date;
  if (!d) return <span className="text-[12px] text-white/60">{msg.text}</span>;

  let weekday = '';
  let bigLine = d.iso;
  try {
    const parsed = new Date(`${d.iso}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      weekday = WEEKDAY_FMT.format(parsed);
      const sameYear = parsed.getUTCFullYear() === new Date().getUTCFullYear();
      bigLine = sameYear ? DATE_NO_YEAR.format(parsed) : DATE_WITH_YEAR.format(parsed);
    }
  } catch { /* keep fallback */ }

  return (
    <div
      className={`relative rounded-2xl px-4 py-3 text-[12px] w-full min-w-0 overflow-hidden transition-transform duration-200 ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-br-none ring-1 ring-inset ring-white/[0.15] hover:-translate-y-0.5'
          : 'bg-white/[0.03] border border-white/[0.08] text-gray-200 rounded-bl-none backdrop-blur-2xl'
      }`}
    >
      {/* Icon: flex-shrink-0 is safer */}
      <Calendar size={14} className="absolute top-3 right-3 opacity-30 flex-shrink-0" aria-hidden="true" />
      
      {/* Eyebrow */}
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
        {weekday || 'Date'}
      </div>
      
      {/* FIX: Added responsive text sizes (text-xl on mobile, text-3xl on desktop).
         Added [overflow-wrap:anywhere] to prevent long months from breaking the bubble.
      */}
      <div className="text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight break-words [overflow-wrap:anywhere]">
        {bigLine}
      </div>

      {/* FIX: Added whitespace-pre-wrap and break-words to label */}
      {d.label && (
        <div className="mt-2 text-[11px] leading-relaxed text-white/60 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {d.label}
        </div>
      )}
    </div>
  );
});

DateBubble.displayName = 'DateBubble';
