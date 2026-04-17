import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

interface CommentComposerProps {
  placeholder?: string;
  replyLabel?: string;
  onCancelReply?: () => void;
  onSubmit: (text: string) => Promise<void>;
  autoFocus?: boolean;
  compact?: boolean;
}

export const CommentComposer = ({
  placeholder = 'Share your thoughts...',
  replyLabel,
  onCancelReply,
  onSubmit,
  autoFocus = false,
  compact = false,
}: CommentComposerProps) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSubmit(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
    if (e.key === 'Escape' && onCancelReply) {
      onCancelReply();
    }
  };

  return (
    <div className={`rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden ${compact ? '' : ''}`}>
      {replyLabel && onCancelReply && (
        <div className="flex items-center justify-between px-4 pt-2.5 pb-0">
          <span className="text-xs text-accent-blue font-bold">{replyLabel}</span>
          <button
            onClick={onCancelReply}
            className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className={`flex items-end gap-2 ${compact ? 'p-2' : 'p-3'}`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className={`flex-1 bg-transparent text-white placeholder:text-gray-600 resize-none outline-none py-1.5 px-1 min-h-[32px] ${compact ? 'text-xs' : 'text-sm'}`}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
          className={`flex-shrink-0 rounded-xl bg-accent-blue text-white hover:bg-accent-blue/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${compact ? 'p-2' : 'p-2.5'}`}
        >
          <Send size={compact ? 14 : 16} />
        </button>
      </div>
    </div>
  );
};
