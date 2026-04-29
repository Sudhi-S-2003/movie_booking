import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, Copy, Check, MessageCircle} from 'lucide-react';
import { gradientForName } from './helpers.js';
import type { ChatMessage } from '../../types.js';

interface ContactBubbleProps {
  msg: ChatMessage;
  isOwn: boolean;
}

export const ContactBubble = memo(({ msg, isOwn }: ContactBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const [pinged, setPinged] = useState(false);
  const c = msg.contact;

  if (!c) {
    return <span className="text-[12px] text-white/60">{msg.text}</span>;
  }

  const fullPhone = `${c.countryCode}${c.phone}`;
  const display = (c.name && c.name.trim()) || fullPhone;
  const waNumber = `${c.countryCode}${c.phone}`.replace(/[^\d]/g, '');
  const waUrl = `https://wa.me/${waNumber}`;

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(fullPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent failure */ }
  };

  const pingCopy = async () => {
    await copyPhone();
    setPinged(true);
    setTimeout(() => setPinged(false), 600);
  };

  const hasName = Boolean(c.name && c.name.trim());
  const avatarGradient = hasName ? gradientForName(c.name!.trim()) : '';

  return (
    <div
      className={`relative flex flex-col w-full min-w-0 overflow-hidden rounded-2xl p-3 sm:p-4 transition-all duration-200 ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-br-none ring-1 ring-inset ring-white/[0.2] shadow-xl shadow-indigo-900/20'
          : 'bg-white/[0.04] border border-white/[0.08] text-gray-200 rounded-bl-none backdrop-blur-xl shadow-lg'
      }`}
    >
      {/* Header: Avatar + Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          {hasName ? (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br ${avatarGradient} text-white font-bold text-base shadow-inner ring-2 ring-white/10`}>
              {c.name!.trim()[0]!.toUpperCase()}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
              <User size={20} className="text-white/60" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1a1a1a] rounded-full" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold text-[14px] leading-tight truncate break-words [overflow-wrap:anywhere]">
            {display}
          </span>
          <button
            type="button"
            onClick={pingCopy}
            className="group relative flex items-center gap-1 text-left text-[11px] text-white/50 hover:text-white transition-colors tabular-nums mt-0.5"
          >
            <span className="truncate">{c.countryCode} {c.phone}</span>
            <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <AnimatePresence>
              {pinged && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5, x: 0 }}
                  animate={{ opacity: 1, scale: 1, x: 10 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute left-full ml-2 text-[9px] font-black text-emerald-400 uppercase tracking-widest whitespace-nowrap"
                >
                  Copied!
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Actions Grid: Responsive 3-col on desktop, wraps on tiny screens */}
      <div className="mt-4 grid grid-cols-3 gap-2 min-w-0">
        <a
          href={`tel:${fullPhone}`}
          className="flex flex-col items-center justify-center gap-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl min-h-[52px] transition-all active:scale-95"
        >
          <Phone size={14} className="opacity-80" />
          <span className="text-[10px] font-bold uppercase tracking-tight">Call</span>
        </a>
        
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/20 text-emerald-300 rounded-xl min-h-[52px] transition-all active:scale-95"
        >
          <MessageCircle size={14} />
          <span className="text-[10px] font-bold uppercase tracking-tight">Chat</span>
        </a>

        <button
          type="button"
          onClick={copyPhone}
          className="flex flex-col items-center justify-center gap-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl min-h-[52px] transition-all active:scale-95"
        >
          {copied ? (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
              <Check size={14} className="text-emerald-400" />
            </motion.div>
          ) : (
            <Copy size={14} className="opacity-80" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-tight">
            {copied ? 'Done' : 'Copy'}
          </span>
        </button>
      </div>

      {/* Optional Note */}
      {msg.text && msg.text !== `${c.countryCode} ${c.phone}` && !msg.text.startsWith('📇') && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[11px] leading-relaxed text-white/50 break-words italic">
            "{msg.text}"
          </p>
        </div>
      )}
    </div>
  );
});

ContactBubble.displayName = 'ContactBubble';
