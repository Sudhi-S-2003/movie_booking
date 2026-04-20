import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CharCounter
//
// Tiny "x / max" pill for length-capped inputs in the chat composer modals.
// Purely visual — the form's own validator (and the server's) remain the
// authoritative gate on submission. The counter just lets users see where
// they stand before they mash "Share".
//
// States:
//   low   — below `min` (still ramping up to a required minimum)
//   ok    — under the warn threshold (default 80% of max)
//   warn  — in the amber band between warnAt and max
//   over  — past the hard max (red)
// ─────────────────────────────────────────────────────────────────────────────

export type CharCounterState = 'low' | 'ok' | 'warn' | 'over';

export const getCharState = (v: string, max: number, min = 0): CharCounterState => {
  const len = v.length;
  if (len > max) return 'over';
  if (min > 0 && len > 0 && len < min) return 'low';
  if (len > max * 0.8) return 'warn';
  return 'ok';
};

interface CharCounterProps {
  value:    string;
  max:      number;
  min?:     number;
  warnAt?:  number; // fraction, default 0.8
  /** Anchor offset — textareas want `bottom-2 right-3` vs inputs `bottom-2.5 right-3`. */
  variant?: 'input' | 'textarea';
}

export const CharCounter: React.FC<CharCounterProps> = ({
  value,
  max,
  min = 0,
  warnAt = 0.8,
  variant = 'input',
}) => {
  const len = value.length;
  const threshold = max * warnAt;

  let cls = 'text-white/40';
  if (len > max) {
    cls = 'text-red-400';
  } else if (len > threshold) {
    cls = 'text-amber-300';
  } else if (min > 0 && len > 0 && len < min) {
    cls = 'text-white/30';
  }

  const pos = variant === 'textarea' ? 'bottom-2 right-3' : 'bottom-2.5 right-3';

  return (
    <span
      aria-live="polite"
      className={`absolute ${pos} select-none pointer-events-none text-[10px] tabular-nums font-semibold ${cls}`}
    >
      {len}/{max}
    </span>
  );
};
