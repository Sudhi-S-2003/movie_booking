import { memo } from 'react';
import { CalendarPlus, MapPin, ExternalLink } from 'lucide-react';
import type { ChatMessage } from '../../types.js';

interface EventBubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
}

const DATE_HEAD_FMT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const TIME_FMT = new Intl.DateTimeFormat([], {
  hour: 'numeric',
  minute: '2-digit',
});

const toGCalStamp = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  } catch {
    return '';
  }
};

const formatRange = (startsAt: string, endsAt?: string): string => {
  const s = new Date(startsAt);
  if (Number.isNaN(s.getTime())) return startsAt;
  const dateHead = DATE_HEAD_FMT.format(s);
  const startT = TIME_FMT.format(s);
  if (!endsAt) return `${dateHead} · ${startT}`;
  const e = new Date(endsAt);
  if (Number.isNaN(e.getTime())) return `${dateHead} · ${startT}`;
  const endT = TIME_FMT.format(e);
  return `${dateHead} · ${startT} – ${endT}`;
};

export const EventBubble = memo(({ msg, isOwn }: EventBubbleProps) => {
  const e = msg.event;
  if (!e) return <span className="text-[12px] text-white/60">{msg.text}</span>;

  const startStamp = toGCalStamp(e.startsAt);
  const endStamp = e.endsAt ? toGCalStamp(e.endsAt) : startStamp;
  const dates = startStamp && endStamp ? `${startStamp}/${endStamp}` : '';

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', e.title);
  if (dates) params.set('dates', dates);
  if (e.location) params.set('location', e.location);
  if (e.description) params.set('details', e.description);
  const gcalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;

  return (
    <div
      className={`relative flex flex-col w-full min-w-0 overflow-hidden rounded-2xl p-3 sm:p-4 gap-3 transition-all duration-200 ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-br-none ring-1 ring-inset ring-white/[0.15] hover:-translate-y-0.5'
          : 'bg-white/[0.04] border border-white/[0.08] text-gray-200 rounded-bl-none backdrop-blur-xl shadow-lg'
      }`}
    >
      {/* Header Section */}
      <div className="flex items-start gap-3 min-w-0 w-full">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/15">
          <CalendarPlus size={18} className="text-white/80" />
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <h4 className="text-[14px] font-black leading-tight tracking-tight break-words [overflow-wrap:anywhere] line-clamp-2">
            {e.title}
          </h4>
          <p className="mt-1 text-[11px] font-medium text-white/60 tabular-nums break-words">
            {formatRange(e.startsAt, e.endsAt)}
          </p>
        </div>
      </div>

      {/* Description Section */}
      {e.description && (
        <div className="w-full border-t border-white/5 pt-2">
          <p className="text-[12px] leading-relaxed text-white/50 whitespace-pre-wrap break-words [overflow-wrap:anywhere] line-clamp-4">
            {e.description}
          </p>
        </div>
      )}

      {/* Location Section - UPDATED FOR MULTI-LINE */}
      {e.location && (
        <div className="flex items-start gap-2 text-[11px] text-white/60 min-w-0">
          <MapPin size={12} className="flex-shrink-0 text-white/40 mt-0.5" />
          <span className="flex-1 min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {e.location}
          </span>
        </div>
      )}

      {/* CTA Button */}
      <a
        href={gcalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-[12px] font-bold text-emerald-400 border border-emerald-500/30 transition-all hover:bg-emerald-500/30 active:scale-[0.98] flex-shrink-0"
      >
        <CalendarPlus size={14} className="flex-shrink-0" />
        <span className="truncate">Add to Calendar</span>
        <ExternalLink size={10} className="opacity-50 flex-shrink-0" />
      </a>
    </div>
  );
});

EventBubble.displayName = 'EventBubble';
