import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import type { BillingCycle } from '../../services/api/index.js';

/**
 * Sliding pill-style billing cycle toggle with shared `layoutId` animation.
 * Implements the ARIA tablist keyboard pattern (← / → to move, Space/Enter
 * activates — here activation is implicit on focus for simplicity).
 *
 * The `layoutIdPrefix` namespaces the sliding indicator per-card so Pro and
 * Pro Max don't share one animated pill across the whole page.
 */
export const PricingToggle = ({
  cycle,
  onChange,
  layoutIdPrefix,
}: {
  cycle:          BillingCycle;
  onChange:       (c: BillingCycle) => void;
  layoutIdPrefix: string;
}) => {
  const refs = useRef<Record<BillingCycle, HTMLButtonElement | null>>({
    monthly: null, quarterly: null,
  });

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: BillingCycle) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next: BillingCycle = current === 'monthly' ? 'quarterly' : 'monthly';
      onChange(next);
      refs.current[next]?.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(current);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Billing cycle"
      className="relative grid grid-cols-2 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1 mb-3"
    >
      {(['monthly', 'quarterly'] as const).map((c) => {
        const active = cycle === c;
        return (
          <button
            key={c}
            ref={(el) => { refs.current[c] = el; }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(c)}
            onKeyDown={(e) => onKeyDown(e, c)}
            className={`relative py-2 sm:py-1.5 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-colors z-10 ${
              active ? 'text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`${layoutIdPrefix}-toggle-pill`}
                className="absolute inset-0 rounded-md bg-accent-pink/90 shadow-sm shadow-accent-pink/30 -z-10"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {c === 'monthly' ? 'Monthly' : 'Quarterly'}
          </button>
        );
      })}
    </div>
  );
};
