import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User } from 'lucide-react';
import type { ChatContactPayload } from '../../types.js';

interface ShareContactModalProps {
  open:     boolean;
  onClose:  () => void;
  onSubmit: (payload: ChatContactPayload) => Promise<void> | void;
}

/**
 * Small modal for sharing a contact. Country code defaults to `+91` per
 * product spec; Escape + click-outside both dismiss.
 */
export const ShareContactModal: React.FC<ShareContactModalProps> = ({ open, onClose, onSubmit }) => {
  const [name,  setName]  = useState('');
  const [code,  setCode]  = useState('+91');
  const [phone, setPhone] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): ChatContactPayload | null => {
    const p = phone.trim();
    const c = code.trim();
    if (p.length < 3 || p.length > 20) { setErr('Phone must be 3–20 characters'); return null; }
    if (!/^\+\d{1,4}$/.test(c))        { setErr('Country code looks like +91');   return null; }
    const out: ChatContactPayload = { phone: p, countryCode: c };
    if (name.trim()) out.name = name.trim();
    return out;
  };

  const submit = async () => {
    const payload = validate();
    if (!payload) return;
    setBusy(true);
    try {
      await onSubmit(payload);
      setName(''); setPhone(''); setCode('+91');
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
            <User size={16} /> Share a contact
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Name (optional)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 mb-3 focus:outline-none focus:border-accent-blue/50"
          placeholder="Alex"
          autoFocus
        />

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Phone</label>
        <div className="flex gap-2 mb-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 tabular-nums focus:outline-none focus:border-accent-blue/50"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 tabular-nums focus:outline-none focus:border-accent-blue/50"
            placeholder="9876543210"
            inputMode="tel"
          />
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
