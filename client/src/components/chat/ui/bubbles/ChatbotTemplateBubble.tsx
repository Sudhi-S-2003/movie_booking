import { memo, useState } from 'react';
import { MessageText } from '../MessageText.js';
import { ReplyPreview } from '../ReplyPreview.js';
import type { ChatMessage } from '../../types.js';
import { Copy, Check } from 'lucide-react';
import {
  HEADER_PLAIN_KEYS,
  BODY_PLAIN_KEYS,
  FOOTER_PLAIN_KEYS,
  LEGACY_BODY_ALIAS,
  LEGACY_HEADER_ALIAS,
} from '../../../../constants/chatbot.constants.js';

const OtpCodeDisplay = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={handleCopy}
      className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/40 hover:bg-slate-900/60 transition-all border border-dashed border-white/20 text-center font-mono tracking-wider shadow-inner cursor-pointer"
    >
      <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1.5 select-none transition-colors group-hover:text-gray-400">Verification Code</div>
      <div className="text-xl font-black text-accent-blue tracking-[0.2em] flex items-center justify-center gap-3">
        <span>{code}</span>
        <button 
          title="Copy code"
          className="text-gray-500 group-hover:text-accent-blue transition-colors focus:outline-none flex items-center justify-center bg-white/5 p-1.5 rounded-md group-hover:bg-accent-blue/10"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

interface ChatbotTemplateBubbleProps {
  msg:               ChatMessage;
  isOwn:             boolean;
  isSameGroupPrev:   boolean;
  showDateSeparator: boolean;
  isFailed:          boolean;
  onJumpToMessage?:  (messageId: string) => void;
}

export const ChatbotTemplateBubble = memo(({
  msg,
  isOwn,
  isSameGroupPrev,
  showDateSeparator,
  isFailed,
  onJumpToMessage,
}: ChatbotTemplateBubbleProps) => {
  const tpl = msg.chatbotTemplate;

  if (!tpl) {
    return (
      <div className="relative min-w-0 overflow-hidden px-3.5 py-2.5 text-[12px] leading-snug break-words [overflow-wrap:anywhere] transition-transform duration-200 bg-white/[0.03] border border-white/[0.08] text-gray-200 rounded-2xl rounded-bl-md">
        <MessageText text={msg.text} isOwn={isOwn} />
      </div>
    );
  }

  // Normalise legacy keys before rendering (backward compat for pre-migration data)
  const sortedHeaders = (tpl.headers || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(h => ({ ...h, key: LEGACY_HEADER_ALIAS[h.key] ?? h.key }));

  const sortedBodies = (tpl.bodies || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(b => ({ ...b, key: LEGACY_BODY_ALIAS[b.key] ?? b.key }));

  const sortedFooters = (tpl.footers || [])
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className={`relative min-w-[240px] max-w-full overflow-hidden p-3.5 text-[12px] leading-snug transition-transform duration-200 ${
        isOwn ? 'hover:-translate-y-0.5' : ''
      } ${
        isOwn
          ? 'bg-gradient-to-br from-indigo-900/90 via-indigo-950/90 to-purple-950/90 text-white rounded-2xl rounded-br-md shadow-2xl shadow-indigo-950/70 ring-1 ring-inset ring-white/[0.15] border border-indigo-500/20'
          : 'bg-gradient-to-br from-slate-900/90 to-zinc-900/95 border border-white/[0.08] hover:bg-white/[0.05] text-gray-200 rounded-2xl rounded-bl-md backdrop-blur-2xl shadow-lg shadow-black/40'
      } ${
        isSameGroupPrev && !showDateSeparator
          ? isOwn ? 'rounded-tr-md' : 'rounded-tl-md'
          : ''
      } ${isFailed ? 'ring-2 ring-red-500/50' : ''}`}
    >
      {msg.replyTo && (
        <ReplyPreview
          senderName={msg.replyTo.senderName}
          text={msg.replyTo.text}
          isOwn={isOwn}
          onClick={onJumpToMessage ? () => onJumpToMessage(msg.replyTo!.messageId) : undefined}
        />
      )}

      {/* ── HEADERS ─────────────────────────────────────────────────────── */}
      {sortedHeaders.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2.5">
          {sortedHeaders.map((h, idx) => {
            // ── Media headers ─────────────────────────────────────────────
            if (h.type === 'image' || h.key === 'media_image') {
              return h.value ? (
                <img
                  key={idx}
                  src={h.value}
                  alt={h.key || 'Image'}
                  className="rounded-lg max-h-48 object-cover w-full border border-white/5 shadow-inner"
                />
              ) : null;
            }
            if (h.type === 'video' || h.key === 'media_video') {
              return h.value ? (
                <video
                  key={idx}
                  src={h.value}
                  controls
                  className="rounded-lg max-h-48 w-full border border-white/5 bg-black"
                />
              ) : null;
            }
            if (h.type === 'document' || h.key === 'media_document') {
              return h.value ? (
                <a
                  key={idx}
                  href={h.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                >
                  <span className="text-[11px] font-medium truncate max-w-[200px]">
                    📄 {h.key !== 'media_document' ? h.key.replace(/_/g, ' ') : 'View Document'}
                  </span>
                </a>
              ) : null;
            }

            // ── Text headers ──────────────────────────────────────────────
            if (h.key === 'announcement') {
              return (
                <div key={idx} className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-200 flex items-center gap-2.5 shadow-inner">
                  <span className="text-base select-none">📢</span>
                  <div className="font-bold text-[12px] tracking-wide text-white/95 leading-normal">
                    {h.value}
                  </div>
                </div>
              );
            }

            if (h.key === 'branding') {
              return (
                <div key={idx} className="text-[11px] italic text-white/50 tracking-wide leading-normal">
                  {h.value}
                </div>
              );
            }

            if (HEADER_PLAIN_KEYS.has(h.key)) {
              return (
                <div key={idx} className="font-bold text-[13px] tracking-wide text-white/95 leading-normal">
                  {h.value}
                </div>
              );
            }

            // Unknown / custom key → labeled row
            return (
              <div key={idx} className="space-y-0.5">
                <span className="font-bold text-white/50 text-[9px] uppercase tracking-wider block">
                  {h.key.replace(/_/g, ' ')}
                </span>
                <div className="font-bold text-[13px] tracking-wide text-white/95 leading-normal">
                  {h.value}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BODIES ──────────────────────────────────────────────────────── */}
      {sortedBodies.length > 0 && (
        <div className="flex flex-col gap-2">
          {sortedBodies.map((b, idx) => {
            if (b.key === 'error_notice') {
              return (
                <div key={idx} className="flex gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 shadow-inner animate-pulse">
                  <div className="text-rose-400 mt-0.5 select-none font-bold text-sm">⚠️</div>
                  <div className="flex-1 min-w-0">
                    <MessageText text={b.value} isOwn={isOwn} />
                  </div>
                </div>
              );
            }

            if (b.key === 'otp_code') {
              return <OtpCodeDisplay key={idx} code={b.value} />;
            }

            if (b.key === 'booking_details') {
              return (
                <div key={idx} className="relative p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/25 text-white overflow-hidden shadow-inner">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-r border-indigo-500/25 rounded-full" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-l border-indigo-500/25 rounded-full" />
                  <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mb-2 select-none border-b border-indigo-500/15 pb-1 flex justify-between">
                    <span>🎟️ Cinema Ticket</span>
                    <span>Receipt</span>
                  </div>
                  <MessageText text={b.value} isOwn={isOwn} />
                </div>
              );
            }

            if (b.key === 'instructions') {
              return (
                <div key={idx} className="flex gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-blue-200">
                  <div className="text-blue-400 mt-0.5 select-none text-sm">ℹ️</div>
                  <div className="flex-1 min-w-0 text-xs">
                    <MessageText text={b.value} isOwn={isOwn} />
                  </div>
                </div>
              );
            }

            if (BODY_PLAIN_KEYS.has(b.key)) {
              return <MessageText key={idx} text={b.value} isOwn={isOwn} />;
            }

            // Unknown / custom body key → labeled row
            return (
              <div key={idx} className="space-y-0.5 animate-fade-in">
                <span className="font-bold text-white/70 text-[9px] uppercase tracking-wider block">
                  {b.key.replace(/_/g, ' ')}
                </span>
                <MessageText text={b.value} isOwn={isOwn} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTERS ─────────────────────────────────────────────────────── */}
      {sortedFooters.length > 0 && (
        <div className="flex flex-col gap-1 mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-white/40 italic leading-tight">
          {sortedFooters.map((f, idx) => {
            if (f.key === 'terms_link' && f.value.startsWith('http')) {
              return (
                <a
                  key={idx}
                  href={f.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-white/60 transition-colors"
                >
                  Terms & Conditions ↗
                </a>
              );
            }

            if (FOOTER_PLAIN_KEYS.has(f.key)) {
              return <div key={idx}>{f.value}</div>;
            }

            // Unknown / custom footer key → small labeled row
            return (
              <div key={idx}>
                <span className="font-semibold text-white/30 uppercase text-[9px] tracking-wider mr-1">
                  {f.key.replace(/_/g, ' ')}:
                </span>
                {f.value}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

ChatbotTemplateBubble.displayName = 'ChatbotTemplateBubble';
