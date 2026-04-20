import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin } from 'lucide-react';
import type { ChatLocationPayload } from '../../types.js';

interface ShareLocationModalProps {
  open:     boolean;
  onClose:  () => void;
  onSubmit: (payload: ChatLocationPayload) => Promise<void> | void;
}

/**
 * Simple lat/lng picker. A full map-picker UX would be nice but is out of
 * scope — keep the composer path honest until we wire in a map library.
 */
export const ShareLocationModal: React.FC<ShareLocationModalProps> = ({ open, onClose, onSubmit }) => {
  const [lat, setLat]     = useState('');
  const [lng, setLng]     = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);
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
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || latN < -90 || latN > 90)   { setErr('Latitude must be between -90 and 90');   return; }
    if (!Number.isFinite(lngN) || lngN < -180 || lngN > 180) { setErr('Longitude must be between -180 and 180'); return; }
    const payload: ChatLocationPayload = { lat: latN, lng: lngN };
    if (label.trim()) payload.label = label.trim();
    setBusy(true);
    try {
      await onSubmit(payload);
      setLat(''); setLng(''); setLabel('');
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
            <MapPin size={16} /> Share a location
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Latitude</label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="12.9716"
              inputMode="decimal"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 tabular-nums focus:outline-none focus:border-accent-blue/50"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Longitude</label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="77.5946"
              inputMode="decimal"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 tabular-nums focus:outline-none focus:border-accent-blue/50"
            />
          </div>
        </div>

        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">Label (optional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 mb-3 focus:outline-none focus:border-accent-blue/50"
          placeholder="Meeting spot"
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
