
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { ReplyPreview } from '../ui/ReplyPreview.js';
import { getAvailablePlatforms, getSocialMeta } from '../../../utils/social-resolver.js';
import { useChatContext } from '../context/ChatContext.js';

export interface ReplyComposerHandle {
  focus: () => void;
}

export const ReplyComposer = forwardRef<ReplyComposerHandle>((_props, ref) => {
  const { issue, replyingTo, setReplyingTo, sendReply } = useChatContext();

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await sendReply(replyText);
      setReplyText('');
      if (textareaRef.current) textareaRef.current.style.height = '40px';
    } catch {
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const addSocialTag = (platform: string) => {
    const tag = `@${platform}:`;
    const el = textareaRef.current;
    if (!el) {
      setReplyText((prev) => prev + tag);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setReplyText(replyText.substring(0, start) + tag + replyText.substring(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  if (issue.status === 'CLOSED') {
    return (
      <div className="border-t border-white/[0.06] bg-[#080809] p-3 flex-shrink-0">
        <div className="flex items-center justify-center py-2 gap-2">
          <CheckCircle2 size={12} className="text-white/15" />
          <p className="text-[8px] font-bold uppercase tracking-wider text-white/15">
            This ticket is closed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.06] bg-[#080809] p-3 flex-shrink-0">
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyingTo && (
          <ReplyPreview
            senderName={replyingTo.senderName}
            text={replyingTo.text}
            onDismiss={() => setReplyingTo(null)}
          />
        )}

        <SocialTagBar onAdd={addSocialTag} />

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Write a reply…"
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (replyText.trim()) void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all text-xs text-white placeholder:text-white/15 resize-none leading-relaxed overflow-hidden custom-scrollbar"
              style={{ minHeight: 40 }}
            />
            <span className="absolute bottom-2.5 right-3 text-[7px] text-white/15 font-medium pointer-events-none hidden sm:block">
              ↵ send · ⇧↵ newline
            </span>
          </div>
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            className="w-9 h-9 flex-shrink-0 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-violet-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:scale-100"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
});
ReplyComposer.displayName = 'ReplyComposer';

const SocialTagBar: React.FC<{ onAdd: (platform: string) => void }> = ({ onAdd }) => (
  <div className="flex items-center gap-1.5 pl-0.5 overflow-x-auto no-scrollbar">
    <span className="text-[7px] font-bold text-white/15 uppercase tracking-wider mr-0.5 flex-shrink-0">
      Quick:
    </span>
    {getAvailablePlatforms().map((p) => {
      const meta = getSocialMeta(`@${p}:user`);
      if (!meta) return null;
      const iconLib = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>>;
      const Icon = iconLib[meta.iconName] ?? LucideIcons.Ghost;
      return (
        <button
          key={p}
          type="button"
          onClick={() => onAdd(p)}
          className="w-6 h-6 rounded-md bg-white/5 border border-white/[0.08] flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/15 flex-shrink-0"
          title={`Add ${p} tag`}
        >
          <Icon size={10} style={{ color: meta.color }} className="opacity-50 hover:opacity-100" />
        </button>
      );
    })}
  </div>
);
