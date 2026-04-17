import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Paperclip, Smile, Zap } from 'lucide-react';
import { ReplyPreview, EmojiPicker, QuickSuggestions, ThreadInput } from '../ui/index.js';
import type { ThreadInputHandle } from '../ui/ThreadInput.js';
import type { ChatMessage } from '../types.js';

interface MessageComposerProps {
  replyingTo:     ChatMessage | null;
  onClearReply:   () => void;
  onSend:         (text: string, replyTo?: ChatMessage) => Promise<void>;
  onTyping:       () => void;
  onStopTyping:   () => void;
  disabled?:      boolean;
  placeholder?:   string;
}

export const MessageComposer = memo(({
  replyingTo,
  onClearReply,
  onSend,
  onTyping,
  onStopTyping,
  disabled,
  placeholder = 'Type a message...',
}: MessageComposerProps) => {
  const [text, setText]                   = useState('');
  const [sending, setSending]             = useState(false);
  const [showEmoji, setShowEmoji]         = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef       = useRef<ThreadInputHandle>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((val: string) => {
    setText(val);
    onTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(onStopTyping, 2000);
  }, [onTyping, onStopTyping]);

  // Focus input when reply changes
  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  const handleInsertText = useCallback((insertion: string) => {
    inputRef.current?.insertText(insertion);
  }, []);

  const toggleEmoji = useCallback(() => {
    setShowEmoji((prev) => !prev);
    setShowSuggestions(false);
  }, []);

  const toggleSuggestions = useCallback(() => {
    setShowSuggestions((prev) => !prev);
    setShowEmoji(false);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSend(trimmed, replyingTo ?? undefined);
      setText('');
      inputRef.current?.clear();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [text, sending, disabled, onSend, replyingTo]);


  return (
    <div className="flex-shrink-0 border-t border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.5)]">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="flex-1 min-w-0">
            <ReplyPreview
              senderName={replyingTo.senderName}
              text={replyingTo.text}
              compact
            />
          </div>
          <button
            onClick={onClearReply}
            className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.1] transition-all flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Emoji button + picker */}
        <div className="relative flex-shrink-0">
          <button
            onClick={toggleEmoji}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
              showEmoji
                ? 'bg-accent-blue/20 border-accent-blue/30 text-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                : 'bg-white/[0.04] border-white/[0.06] text-white/25 hover:text-white/50 hover:bg-white/[0.08] shadow-inner shadow-black/20'
            }`}
            title="Emoji"
          >
            <Smile size={16} />
          </button>
          <AnimatePresence>
            {showEmoji && (
              <EmojiPicker 
                onSelect={handleInsertText} 
                onClose={() => setShowEmoji(false)} 
              />
            )}
          </AnimatePresence>
        </div>

        {/* Suggestion button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={toggleSuggestions}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
              showSuggestions
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-white/[0.04] border-white/[0.06] text-white/25 hover:text-white/50 hover:bg-white/[0.08] shadow-inner shadow-black/20'
            }`}
            title="Quick Suggestions"
          >
            <Zap size={15} fill={showSuggestions ? 'currentColor' : 'none'} />
          </button>
          <AnimatePresence>
            {showSuggestions && (
              <QuickSuggestions 
                onSelect={handleInsertText} 
                onClose={() => setShowSuggestions(false)} 
              />
            )}
          </AnimatePresence>
        </div>

        {/* Attachment button */}
        <button
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/[0.08] transition-all flex-shrink-0"
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>

        {/* Text input */}
        <ThreadInput
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onSend={handleSend}
          placeholder={placeholder}
          disabled={disabled || sending}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center text-white shadow-lg shadow-accent-blue/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex-shrink-0"
        >
          <Send size={15} className={sending ? 'animate-pulse' : ''} />
        </button>
      </div>
    </div>
  );
});

MessageComposer.displayName = 'MessageComposer';
