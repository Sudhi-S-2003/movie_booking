import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Plus, Smile, Zap, User, MapPin, Image as ImageIcon, Calendar, CalendarPlus } from 'lucide-react';
import { ReplyPreview, EmojiPicker, QuickSuggestions, ThreadInput } from '../ui/index.js';
import type { ThreadInputHandle } from '../ui/ThreadInput.js';
import { ShareContactModal } from './composerAttachments/ShareContactModal.js';
import { ShareLocationModal } from './composerAttachments/ShareLocationModal.js';
import { ShareDateModal } from './composerAttachments/ShareDateModal.js';
import { CreateEventModal } from './composerAttachments/CreateEventModal.js';
import type {
  ChatMessage,
  ChatContactPayload,
  ChatLocationPayload,
  ChatDatePayload,
  ChatEventPayload,
} from '../types.js';
import type { SendMessagePayload } from '../context/ChatContext.js';

interface MessageComposerProps {
  replyingTo:     ChatMessage | null;
  onClearReply:   () => void;
  onSend:         (payload: SendMessagePayload | string, replyTo?: ChatMessage) => Promise<void>;
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
  const [text, setText]                     = useState('');
  const [sending, setSending]               = useState(false);
  const [showEmoji, setShowEmoji]           = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showContactModal, setShowContactModal]   = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal]         = useState(false);
  const [showEventModal, setShowEventModal]       = useState(false);
  const inputRef       = useRef<ThreadInputHandle>(null);
  const attachMenuRef  = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((val: string) => {
    setText(val);
    onTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(onStopTyping, 2000);
  }, [onTyping, onStopTyping]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  // Click-outside for attachments menu
  useEffect(() => {
    if (!showAttachMenu) return;
    const onClick = (e: MouseEvent) => {
      if (!attachMenuRef.current?.contains(e.target as Node)) setShowAttachMenu(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [showAttachMenu]);

  const handleInsertText = useCallback((insertion: string) => {
    inputRef.current?.insertText(insertion);
  }, []);

  const toggleEmoji = useCallback(() => {
    setShowEmoji((prev) => !prev);
    setShowSuggestions(false);
    setShowAttachMenu(false);
  }, []);

  const toggleSuggestions = useCallback(() => {
    setShowSuggestions((prev) => !prev);
    setShowEmoji(false);
    setShowAttachMenu(false);
  }, []);

  const toggleAttach = useCallback(() => {
    setShowAttachMenu((prev) => !prev);
    setShowEmoji(false);
    setShowSuggestions(false);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSend({ kind: 'text', text: trimmed }, replyingTo ?? undefined);
      setText('');
      inputRef.current?.clear();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [text, sending, disabled, onSend, replyingTo]);

  const handleSubmitContact = useCallback(async (contact: ChatContactPayload) => {
    await onSend({ kind: 'contact', contact }, replyingTo ?? undefined);
  }, [onSend, replyingTo]);

  const handleSubmitLocation = useCallback(async (location: ChatLocationPayload) => {
    await onSend({ kind: 'location', location }, replyingTo ?? undefined);
  }, [onSend, replyingTo]);

  const handleSubmitDate = useCallback(async (date: ChatDatePayload) => {
    await onSend({ kind: 'date', date }, replyingTo ?? undefined);
  }, [onSend, replyingTo]);

  const handleSubmitEvent = useCallback(async (event: ChatEventPayload) => {
    await onSend({ kind: 'event', event }, replyingTo ?? undefined);
  }, [onSend, replyingTo]);

  return (
    <div
      className="flex-shrink-0 border-t border-white/[0.08] bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-1">
          <div className="flex-1 min-w-0">
            <ReplyPreview senderName={replyingTo.senderName} text={replyingTo.text} compact />
          </div>
          <button
            onClick={onClearReply}
            className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.1] transition-all flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3 md:p-4">
        {/* Emoji picker */}
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
              <EmojiPicker onSelect={handleInsertText} onClose={() => setShowEmoji(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* Quick suggestions */}
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
              <QuickSuggestions onSelect={handleInsertText} onClose={() => setShowSuggestions(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* Attachments menu */}
        <div className="relative flex-shrink-0" ref={attachMenuRef}>
          <button
            onClick={toggleAttach}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              showAttachMenu
                ? 'bg-accent-blue/20 border-accent-blue/30 text-accent-blue'
                : 'bg-white/[0.04] border-white/[0.06] text-white/25 hover:text-white/50 hover:bg-white/[0.08]'
            }`}
            title="Attach"
          >
            <Plus size={16} />
          </button>
          <AnimatePresence>
            {showAttachMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-12 left-0 max-[380px]:left-auto max-[380px]:right-0 bg-[#0e0e12] border border-white/[0.08] rounded-xl shadow-2xl py-1 min-w-[180px] max-w-[calc(100vw-1rem)] z-20"
              >
                <MenuItem
                  icon={<User size={14} />}
                  label="Share contact"
                  onClick={() => { setShowAttachMenu(false); setShowContactModal(true); }}
                />
                <MenuItem
                  icon={<MapPin size={14} />}
                  label="Share location"
                  onClick={() => { setShowAttachMenu(false); setShowLocationModal(true); }}
                />
                <MenuItem
                  icon={<Calendar size={14} />}
                  label="Share date"
                  onClick={() => { setShowAttachMenu(false); setShowDateModal(true); }}
                />
                <MenuItem
                  icon={<CalendarPlus size={14} />}
                  label="Create event"
                  onClick={() => { setShowAttachMenu(false); setShowEventModal(true); }}
                />
                <MenuItem
                  icon={<ImageIcon size={14} />}
                  label="Image (coming soon)"
                  onClick={() => setShowAttachMenu(false)}
                  disabled
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ThreadInput
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onSend={handleSend}
          placeholder={placeholder}
          disabled={disabled || sending}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center text-white shadow-lg shadow-accent-blue/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex-shrink-0"
        >
          <Send size={15} className={sending ? 'animate-pulse' : ''} />
        </button>
      </div>

      <ShareContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSubmit={handleSubmitContact}
      />
      <ShareLocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSubmit={handleSubmitLocation}
      />
      <ShareDateModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        onSubmit={handleSubmitDate}
      />
      <CreateEventModal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSubmit={handleSubmitEvent}
      />
    </div>
  );
});

MessageComposer.displayName = 'MessageComposer';

interface MenuItemProps {
  icon:      React.ReactNode;
  label:     string;
  onClick:   () => void;
  disabled?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors ${
      disabled
        ? 'text-white/25 cursor-not-allowed'
        : 'text-white/75 hover:bg-white/[0.05]'
    }`}
  >
    {icon}
    {label}
  </button>
);
