import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RotateCw } from 'lucide-react';
import { MessageStatus } from './MessageStatus.js';
import { ReplyPreview } from './ReplyPreview.js';
import {
  TextBubble,
  EmojiBubble,
  ContactBubble,
  LocationBubble,
  ImageBubble,
  FileBubble,
  SystemBubble,
  DateBubble,
  EventBubble,
} from './bubbles/index.js';
import type { ChatMessage } from '../types.js';

interface MessageBubbleProps {
  msg:              ChatMessage;
  isOwn:            boolean;
  isSameGroupPrev:  boolean;
  isSameGroupNext:  boolean;
  showDateSeparator: boolean;
  dateLabel:        string;
  isHighlighted?:   boolean;
  onReply?:         (msg: ChatMessage) => void;
  onDelete?:        (messageId: string) => void;
  onRetry?:         (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

/**
 * Dispatcher that routes to the per-type bubble renderer. Owns the shared
 * wrapping concerns (avatar, sender name, timestamp, delivery status,
 * own/other alignment, hover actions) so each bubble component only has to
 * render its inner content.
 *
 * Backward-compat: legacy rows with no `contentType` (or with `'text'`)
 * fall through to TextBubble; the emoji/contact/location branches only
 * trigger when the payload is actually present.
 */
export const MessageBubble = memo(({
  msg,
  isOwn,
  isSameGroupPrev,
  isSameGroupNext,
  showDateSeparator,
  dateLabel,
  isHighlighted,
  onReply,
  onDelete,
  onRetry,
  onJumpToMessage,
}: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false);
  const isSending = msg._status === 'sending';
  const isFailed  = msg._status === 'failed';
  const isSystemMsg = msg.isSystem || msg.contentType === 'system';
  const isEmoji = msg.contentType === 'emoji';

  // System messages render centered — no avatar, no alignment.
  if (isSystemMsg) {
    return (
      <>
        {showDateSeparator && <DateSeparator label={dateLabel} />}
        <SystemBubble msg={msg} />
      </>
    );
  }

  const renderInner = () => {
    switch (msg.contentType) {
      case 'emoji':
        return <EmojiBubble msg={msg} />;
      case 'contact':
        return <ContactBubble msg={msg} isOwn={isOwn} />;
      case 'location':
        return <LocationBubble msg={msg} isOwn={isOwn} />;
      case 'image':
        return <ImageBubble msg={msg} isOwn={isOwn} />;
      case 'file':
        return <FileBubble msg={msg} isOwn={isOwn} />;
      case 'date':
        return <DateBubble msg={msg} isOwn={isOwn} />;
      case 'event':
        return <EventBubble msg={msg} isOwn={isOwn} />;
      case 'text':
      default:
        return (
          <TextBubble
            msg={msg}
            isOwn={isOwn}
            isSameGroupPrev={isSameGroupPrev}
            showDateSeparator={showDateSeparator}
            isFailed={isFailed}
            {...(onJumpToMessage ? { onJumpToMessage } : {})}
          />
        );
    }
  };

  return (
    <>
      {showDateSeparator && <DateSeparator label={dateLabel} />}

      <motion.div
        data-msg-id={msg._id}
        initial={{ opacity: 0, y: 4 }}
        animate={{
          opacity: isSending ? 0.6 : 1,
          y: 0,
          backgroundColor: isHighlighted ? 'rgba(139, 92, 246, 0.12)' : 'rgba(0, 0, 0, 0)',
        }}
        transition={{ duration: 0.2 }}
        // `w-full min-w-0` is load-bearing: without an explicit width on this
        // flex row, the percentage max-width on the inner bubble collapses
        // (browsers can't resolve `78%` against a parent whose own width is
        // determined by its content). That caused long messages to render
        // wider than the viewport on mobile.
        className={`flex w-full min-w-0 items-end gap-2 rounded-xl ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
          isSameGroupPrev && !showDateSeparator ? 'mt-0.5' : 'mt-3'
        } group`}
      >
        <div className="w-7 h-7 flex-shrink-0">
          {!isSameGroupNext && !isEmoji && (
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                isOwn
                  ? 'bg-gradient-to-br from-violet-600/90 to-indigo-700/90 shadow-sm shadow-violet-500/15'
                  : 'bg-white/10 border border-white/10'
              }`}
            >
              {msg.senderName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        <div className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[60%] xl:max-w-[520px] ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isSameGroupPrev && !isOwn && !isEmoji && (
            <span className="text-[8px] font-bold uppercase tracking-widest mb-1 px-1 text-white/30">
              {msg.senderName}
            </span>
          )}

          <div className="relative group/bubble">
            {!isSending && (
              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex gap-0.5 z-10 ${
                isOwn ? '-left-24' : '-right-24'
              }`}>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(msg.text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-6 h-6 rounded-md bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.12] transition-all relative"
                  title="Copy text"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Check size={12} className="text-emerald-400" />
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Copy size={12} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                {onReply && (
                  <button
                    onClick={() => onReply(msg)}
                    className="w-6 h-6 rounded-md bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.12] transition-all"
                    title="Reply"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                )}
                {isOwn && onDelete && (
                  <button
                    onClick={() => onDelete(msg._id)}
                    className="w-6 h-6 rounded-md bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Non-text bubbles render their own reply preview inline when they
                need one; TextBubble already embeds ReplyPreview. For media /
                card bubbles we render reply preview above as a small hint. */}
            {msg.replyTo && msg.contentType !== 'text' && msg.contentType !== 'emoji' && (
              <div className="mb-1">
                <ReplyPreview
                  senderName={msg.replyTo.senderName}
                  text={msg.replyTo.text}
                  isOwn={isOwn}
                  {...(onJumpToMessage && { onClick: () => onJumpToMessage(msg.replyTo!.messageId) })}
                />
              </div>
            )}

            {renderInner()}
          </div>

          {!isSameGroupNext && (
            <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <span className={`text-[9px] font-medium tabular-nums ${isEmoji ? 'text-white/40' : 'text-white/25'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isOwn && (
                <MessageStatus status={msg.deliveryStatus} isSending={isSending} isFailed={isFailed} />
              )}
              {isFailed && (
                <>
                  <span className="text-[8px] text-red-400 font-medium">Failed</span>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={() => onRetry(msg._id)}
                      className="text-[9px] text-red-300 hover:text-red-100 font-semibold uppercase tracking-wider flex items-center gap-0.5 transition-colors"
                      aria-label="Retry send"
                      title="Retry sending this message"
                    >
                      <RotateCw size={10} />
                      Retry
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
});

MessageBubble.displayName = 'MessageBubble';

const DateSeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-white/[0.06]" />
    <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.15em] px-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-full">
      {label}
    </span>
    <div className="flex-1 h-px bg-white/[0.06]" />
  </div>
);
