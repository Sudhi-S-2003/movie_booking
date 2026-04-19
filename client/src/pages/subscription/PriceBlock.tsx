import { motion, AnimatePresence } from 'framer-motion';
import type { BillingCycle } from '../../services/api/index.js';

/**
 * Redesigned price block.
 *
 *   ₹200                    <- displayPrice, text-5xl font-black tabular-nums
 *   ₹̶499   60% OFF          <- base strike + pill inline (paid + offer only)
 *   /mo or /3 mo
 *   ≈ ₹180/mo · Save ₹299   <- quarterly only, tiny caption
 *
 * Price changes on cycle toggle fade/slide smoothly via `AnimatePresence`.
 */
export const PriceBlock = ({
  displayPrice,
  basePrice,
  perMonthDisplay,
  saveDisplay,
  cycle,
  hasOffer,
  discountPct,
}: {
  displayPrice:    number;
  basePrice:       number;
  perMonthDisplay: number;
  saveDisplay:     number;
  cycle:           BillingCycle;
  hasOffer:        boolean;
  discountPct:     number;
}) => {
  const perUnit = cycle === 'monthly' ? '/mo' : '/3 mo';
  return (
    <div className="flex flex-col items-start gap-1 mb-4 min-h-[108px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${cycle}-${displayPrice}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-col items-start gap-1"
        >
          <span className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none">
            ₹{displayPrice.toLocaleString('en-IN')}
          </span>

          {hasOffer && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/35 line-through tabular-nums">
                ₹{basePrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-400/15 border border-emerald-400/30 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                {discountPct}% OFF
              </span>
            </div>
          )}

          <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
            {perUnit}
          </span>

          {cycle === 'quarterly' && (
            <span className="text-[10px] font-bold text-white/40 tabular-nums">
              ≈ ₹{perMonthDisplay.toLocaleString('en-IN')}/mo
              {saveDisplay > 0 && (
                <>
                  {' · '}
                  <span className="text-emerald-400">
                    Save ₹{saveDisplay.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
