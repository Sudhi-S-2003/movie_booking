
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { MessageBubble } from '../ui/MessageBubble.js';
import { ChatSkeletonScreen } from '../ui/Skeletons.js';
import { formatDateLabel } from '../utils.js';
import { useChatContext } from '../context/ChatContext.js';
import type { IssueMessage } from '../types.js';
import { IssueDescriptionCard } from './IssueDescriptionCard.js';

interface MessageThreadProps {
  onReplyTo: (msg: IssueMessage) => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ onReplyTo }) => {
  const {
    issue,
    messages,
    loading,
    initialLoading,
    hasBefore,
    hasAfter,
    showScrollBtn,
    highlightedId,
    containerRef,
    endRef,
    topSentinelRef,
    bottomSentinelRef,
    scrollToBottom,
    scrollToMessage,
  } = useChatContext();

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      <div ref={containerRef} className="h-full overflow-y-auto custom-scrollbar">
        <div ref={topSentinelRef} className="h-1 w-full" />

        {loading && messages.length > 0 && !initialLoading && (
          <LoaderStrip label="Loading earlier…" />
        )}

        {hasBefore && !loading && <EdgeHint label="↑ scroll for older" />}

        {initialLoading ? (
          <ChatSkeletonScreen />
        ) : (
          <div className="px-4 py-3 space-y-0.5">
            {!hasBefore && <IssueDescriptionCard issue={issue} />}

            {messages.map((msg, i) => {
              const prevMsg = messages[i - 1];
              const nextMsg = messages[i + 1];
              const msgDate = new Date(msg.createdAt).toDateString();
              const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
              const isOwn = !!msg.isYou;
              return (
                <MessageBubble
                  key={msg._id || i}
                  msg={msg}
                  isOwn={isOwn}
                  isSameGroupPrev={!!(prevMsg && !!prevMsg.isYou === isOwn)}
                  isSameGroupNext={!!(nextMsg && !!nextMsg.isYou === isOwn)}
                  showDateSeparator={msgDate !== prevDate}
                  dateLabel={formatDateLabel(msg.createdAt)}
                  isSending={msg._status === 'sending'}
                  isHighlighted={highlightedId === msg._id}
                  onReply={onReplyTo}
                  onJumpToMessage={scrollToMessage}
                />
              );
            })}

            {messages.length === 0 && !loading && <EmptyState />}
          </div>
        )}

        <div ref={bottomSentinelRef} className="h-1 w-full" />

        {hasAfter && !loading && <EdgeHint label="↓ scroll for newer" />}
        {loading && hasAfter && <LoaderStrip label="Loading newer…" />}

        <div ref={endRef} className="h-3 flex-shrink-0" />
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 right-3 w-8 h-8 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/30 hover:scale-110 active:scale-95 transition-transform z-10"
          >
            <ChevronDown size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoaderStrip: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center gap-2 py-2">
    <Loader2 size={12} className="animate-spin text-accent-blue" />
    <span className="text-[8px] font-bold uppercase tracking-wider text-white/30">{label}</span>
  </div>
);

const EdgeHint: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-2">
    <span className="text-[7px] font-bold text-white/15 uppercase tracking-[0.3em]">
      {label}
    </span>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-10 gap-3">
    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
      <MessageSquare size={18} className="text-white/10" />
    </div>
    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/15">
      No replies yet — start the conversation
    </p>
  </div>
);
