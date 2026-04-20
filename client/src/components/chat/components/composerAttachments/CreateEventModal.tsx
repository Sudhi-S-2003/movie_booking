import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarPlus } from 'lucide-react';
import type { ChatEventPayload } from '../../types.js';
import { CharCounter, getCharState } from './CharCounter.js';

const TITLE_MAX = 120;
const TITLE_MIN = 1;
const LOC_MAX   = 200;
const DESC_MAX  = 500;

const overCls = (over: boolean): string =>
  over ? 'border-red-400/60' : 'border-white/[0.08]';

interface CreateEventModalProps {
  open:     boolean;
  onClose:  () => void;
  onSubmit: (payload: ChatEventPayload) => Promise<void> | void;
}

/**
 * Schedule an event. `datetime-local` values are plain wall-clock strings
 * (no timezone), which we ship to the server as-is — `Date.parse` treats
 * them as local time on both sides. Good enough for the current product;
 * a proper timezone picker is out of scope.
 */
export const CreateEventModal: React.FC<CreateEventModalProps> = ({ open, onClose, onSubmit }) => {
  const [title,    setTitle]    = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt,   setEndsAt]   = useState('');
  const [loc,      setLoc]      = useState('');
  const [desc,     setDesc]     = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
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
    const t = title.trim();
    if (t.length < 1 || t.length > 120) { setErr('Title must be 1–120 characters'); return; }
    const s = startsAt.trim();
    if (!s || Number.isNaN(Date.parse(s))) { setErr('Valid start date/time is required'); return; }
    const payload: ChatEventPayload = { title: t, startsAt: s };
    if (endsAt.trim()) {
      const eTs = Date.parse(endsAt);
      if (Number.isNaN(eTs)) { setErr('End date/time is invalid'); return; }
      if (eTs < Date.parse(s)) { setErr('End must be at or after start'); return; }
      payload.endsAt = endsAt.trim();
    }
    if (loc.trim()) {
      if (loc.trim().length > 200) { setErr('Location must be ≤ 200 chars'); return; }
      payload.location = loc.trim();
    }
    if (desc.trim()) {
      if (desc.trim().length > 500) { setErr('Description must be ≤ 500 chars'); return; }
      payload.description = desc.trim();
    }
    setBusy(true);
    try {
      await onSubmit(payload);
      setTitle(''); setStartsAt(''); setEndsAt(''); setLoc(''); setDesc('');
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
        className="bg-[#0e0e12] border border-white/[0.08] rounded-2xl p-5 w-[min(92vw,440px)] my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white/90 text-sm font-semibold">
            <CalendarPlus size={16} /> Create an event
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Title</label>
        <div className="relative mb-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            className={`w-full bg-white/[0.04] border ${overCls(getCharState(title, TITLE_MAX, TITLE_MIN) === 'over')} rounded-lg pl-3 pr-14 py-2 text-sm text-white/90 focus:outline-none focus:border-accent-blue/50`}
            placeholder="Move-in walkthrough"
            autoFocus
          />
          <CharCounter value={title} max={TITLE_MAX} min={TITLE_MIN} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Starts</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Ends (optional)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-accent-blue/50"
            />
          </div>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Location (optional)</label>
        <div className="relative mb-3">
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            maxLength={LOC_MAX}
            className={`w-full bg-white/[0.04] border ${overCls(getCharState(loc, LOC_MAX) === 'over')} rounded-lg pl-3 pr-14 py-2 text-sm text-white/90 focus:outline-none focus:border-accent-blue/50`}
            placeholder="123 Main St, SF"
          />
          <CharCounter value={loc} max={LOC_MAX} />
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Description (optional)</label>
        <div className="relative mb-3">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={DESC_MAX}
            rows={3}
            className={`w-full bg-white/[0.04] border ${overCls(getCharState(desc, DESC_MAX) === 'over')} rounded-lg pl-3 pr-14 py-2 pb-4 text-sm text-white/90 focus:outline-none focus:border-accent-blue/50 resize-none`}
            placeholder="Bring a copy of the signed contract."
          />
          {/* Inline progress bar — the description can run long; a subtle fill
              against the accent colour gives people a quick glance at how
              much runway they have left. Caps visually at 100%. */}
          <div
            aria-hidden
            className="absolute left-3 right-3 bottom-1.5 h-0.5 bg-white/[0.04] rounded-full overflow-hidden"
          >
            <div
              className={`h-full ${getCharState(desc, DESC_MAX) === 'over' ? 'bg-red-400/70' : 'bg-accent-blue/40'}`}
              style={{ width: `${Math.min(100, (desc.length / DESC_MAX) * 100)}%` }}
            />
          </div>
          <CharCounter value={desc} max={DESC_MAX} variant="textarea" />
        </div>

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
