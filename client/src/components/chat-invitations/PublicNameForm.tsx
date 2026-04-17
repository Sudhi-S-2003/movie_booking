import React, { memo, useCallback, useState } from 'react';
import { Copy, Check, Globe, Trash2 } from 'lucide-react';
import { chatApi } from '../../services/api/chat.api.js';
import { ApiError } from '../../services/api/http.js';
import { buildPublicChatUrl } from './utils/inviteUrl.js';

interface PublicNameFormProps {
  conversationId: string;
  initialValue:   string | null;
  onChange?:      (publicName: string | null) => void;
}

/**
 * Inline form that lets the group owner set / update / clear the
 * conversation's public name (slug). On success the absolute social URL
 * is shown with a copy-to-clipboard affordance.
 */
export const PublicNameForm = memo(({
  conversationId,
  initialValue,
  onChange,
}: PublicNameFormProps) => {
  const [value,     setValue]     = useState(initialValue ?? '');
  const [saved,     setSaved]     = useState(initialValue);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);

  const dirty = value.trim() !== (saved ?? '');

  const persist = useCallback(async (next: string | null) => {
    setSaving(true);
    setError(null);
    try {
      const res = await chatApi.setPublicName(conversationId, next);
      setSaved(res.conversation.publicName ?? null);
      setValue(res.conversation.publicName ?? '');
      onChange?.(res.conversation.publicName ?? null);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to save public name');
    } finally {
      setSaving(false);
    }
  }, [conversationId, onChange]);

  const handleCopy = useCallback(async () => {
    if (!saved) return;
    try {
      await navigator.clipboard.writeText(buildPublicChatUrl(saved));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }, [saved]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
        <Globe size={12} /> Public Name
      </div>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          placeholder="e.g. movie-buffs"
          className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.15] transition-colors"
        />
        <button
          onClick={() => void persist(value.trim() || null)}
          disabled={saving || !dirty}
          className="px-4 py-2.5 bg-accent-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md shadow-accent-blue/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <button
            onClick={() => void persist(null)}
            disabled={saving}
            title="Clear public name"
            className="px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-gray-400 hover:text-rose-300 hover:border-rose-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {error && <p className="text-[10px] font-bold text-rose-300">{error}</p>}

      {saved && !dirty && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15">
          <code className="flex-1 text-[10px] font-mono text-emerald-300 truncate">
            {buildPublicChatUrl(saved)}
          </code>
          <button
            onClick={() => void handleCopy()}
            className="px-2 py-1 text-emerald-300/80 hover:text-emerald-200"
            title="Copy URL"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      )}
    </div>
  );
});

PublicNameForm.displayName = 'PublicNameForm';
