import { memo, useCallback, useState } from 'react';
import { Clock, Send } from 'lucide-react';
import { chatApi } from '../../services/api/chat.api.js';
import { ApiError } from '../../services/api/http.js';

interface JoinRequestPanelProps {
  conversationId:    string;
  initiallyPending:  boolean;
}

/**
 * "Request to join" call-to-action for group conversations where the
 * viewer is authenticated but not yet a member.
 *
 * State machine:
 *   idle → submitting → (pending | error)
 *   pending (from server or from submit) → static "request sent" banner
 */
export const JoinRequestPanel = memo(({
  conversationId,
  initiallyPending,
}: JoinRequestPanelProps) => {
  const [pending,    setPending]    = useState(initiallyPending);
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (submitting || pending) return;
    setSubmitting(true);
    setError(null);
    try {
      await chatApi.createJoinRequest(conversationId, message.trim() || undefined);
      setPending(true);
    } catch (e: unknown) {
      if (e instanceof ApiError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  }, [conversationId, message, submitting, pending]);

  if (pending) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
          <Clock size={18} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">
          Request Sent
        </p>
        <p className="text-[11px] text-gray-500 max-w-xs">
          You'll be notified once the group owner approves your request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 500))}
        placeholder="Optional message for the group owner…"
        rows={3}
        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.15] transition-colors resize-none"
      />
      {error && (
        <p className="text-[10px] font-bold text-rose-300">{error}</p>
      )}
      <button
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="w-full py-3 bg-accent-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.01] transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Send size={13} />
        {submitting ? 'Sending…' : 'Request to Join'}
      </button>
    </div>
  );
});

JoinRequestPanel.displayName = 'JoinRequestPanel';
