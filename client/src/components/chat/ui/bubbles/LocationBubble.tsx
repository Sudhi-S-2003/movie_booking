import React, { memo } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import type { ChatMessage } from '../../types.js';

interface LocationBubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
}

const MAP_TEXTURE: React.CSSProperties = {
  backgroundColor: '#1a1d21',
  backgroundImage: [
    'radial-gradient(circle at 20% 30%, rgba(110,160,120,0.25) 0, transparent 45%)',
    'radial-gradient(circle at 75% 65%, rgba(80,130,150,0.20) 0, transparent 50%)',
    'radial-gradient(circle at 50% 85%, rgba(180,190,150,0.15) 0, transparent 55%)',
    'linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.03) 75%, transparent 75%)',
  ].join(', '),
  backgroundSize: '100% 100%, 100% 100%, 100% 100%, 14px 14px',
};

export const LocationBubble = memo(({ msg, isOwn }: LocationBubbleProps) => {
  const l = msg.location;
  if (!l) return <span className="text-[12px] text-white/60">{msg.text}</span>;

  // FIX: Valid Google Maps URL construction
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;

  return (
    <div
      className={`relative flex flex-col w-full min-w-0 overflow-hidden rounded-2xl p-3 sm:p-4 transition-all duration-200 ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-br-none ring-1 ring-inset ring-white/[0.15]'
          : 'bg-white/[0.04] border border-white/[0.08] text-gray-200 rounded-bl-none backdrop-blur-xl'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 shadow-inner">
          <MapPin size={18} className="text-white/80" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          {l.label && (
            <span className="font-bold text-[13px] leading-tight break-words [overflow-wrap:anywhere] line-clamp-1">
              {l.label}
            </span>
          )}
          <span className="text-[11px] text-white/50 tabular-nums truncate tracking-tight">
            {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Abstract Map Preview */}
      <div
        role="presentation"
        aria-hidden="true"
        className="relative mt-3 h-24 rounded-xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors"
        style={MAP_TEXTURE}
      >
        {/* Grid Overlay for "Map" feel */}
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
        />
        
        {/* Pulse Indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 w-full h-full rounded-full bg-sky-400 animate-ping opacity-75" />
            <div className="relative w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] border-2 border-white" />
          </div>
        </div>
        
        {/* Decorative Compass corner */}
        <div className="absolute bottom-2 right-2 text-[8px] font-bold text-white/20 select-none">
          N ↑
        </div>
      </div>

      {/* Action Button */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl min-h-[44px] text-[12px] font-bold tracking-tight transition-all active:scale-95 w-full"
      >
        <ExternalLink size={14} className="flex-shrink-0" />
        Open in Google Maps
      </a>

      {/* Secondary Text fallback if needed */}
      {msg.text && msg.text !== l.label && (
        <p className="mt-2 text-[11px] text-white/40 italic break-words line-clamp-2 px-1">
          {msg.text}
        </p>
      )}
    </div>
  );
});

LocationBubble.displayName = 'LocationBubble';