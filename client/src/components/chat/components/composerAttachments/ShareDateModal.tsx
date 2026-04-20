import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import type { ChatDatePayload } from '../../types.js';

interface ShareDateModalProps {
  open:     boolean;
  onClose:  () => void;
  onSubmit: (payload: ChatDatePayload) => Promise<void> | void;
}

/**
 * Share a single calendar date. `iso` is the native `<input type="date">`
 * value (YYYY-MM-DD), which matches the server's validation regex exactly
 * — no timezone shenanigans.
 */
export const ShareDateModal: React.FC<ShareDateModalProps> = ({ open, onClose, onSubmit }) => {
  const [iso,   setIso]   = useState('');
  const [label, setLabel] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { setErr('Pick a valid date'); return; }
    if (label.length > 120) { setErr('Label must be ≤ 120 characters'); return; }
    const payload: ChatDatePayload = { iso };
    if (label.trim()) payload.label = label.trim();
    setBusy(true);
    try {
      await onSubmit(payload);
      setIso(''); setLabel('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return createPortal((
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (!panelRef.current?.contains(e.target as Node)) onClose(); }}
    >
      <div
        ref={panelRef}
        className="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-5 w-[min(92vw,380px)] my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white/90 text-sm font-semibold">
            <Calendar size={16} /> Share a date
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Date</label>
        <input
          type="date"
          value={iso}
          onChange={(e) => setIso(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 mb-3 focus:outline-none focus:border-accent-blue/50"
          autoFocus
        />

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={120}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 mb-3 focus:outline-none focus:border-accent-blue/50"
          placeholder="Move-out day"
        />

        {err && <p className="text-[11px] text-red-400 mb-2">{err}</p>}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-3 py-1.5 text-[12px] bg-accent-blue text-white rounded-lg hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
};
