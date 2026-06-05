import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { PricingToggle } from './PricingToggle.js';
import { PriceBlock } from './PriceBlock.js';
import { FeatureList } from './FeatureList.js';
import type { PlanCatalogItem, BillingCycle } from '../../services/api/index.js';
import type { OfferType } from '../../services/api/subscription.api.js';

export const PlanCardAnimated = ({ children, delay }: { children: React.ReactNode; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    className="h-full"
  >
    {children}
  </motion.div>
);

export interface PlanCardProps {
  tone:            'free' | 'enterprise' | 'pro' | 'proMax';
  icon:            React.ReactNode;
  name:            string;
  tagline:         string;
  features:        readonly string[];
  priceMonthly:    number | null;
  priceQuarterly:  number | null;
  customPriceLabel?: string;
  isCurrent:       boolean;
  ribbon:          'recommended' | 'current' | null;
  cta:             React.ReactNode;
  promoChip?:      React.ReactNode;
}

const toneHover: Record<PlanCardProps['tone'], string> = {
  free:       '',
  pro:        'hover:translate-y-[-2px] hover:shadow-xl hover:shadow-accent-blue/10',
  proMax:     'hover:translate-y-[-2px] hover:shadow-xl hover:shadow-accent-pink/10',
  enterprise: 'hover:translate-y-[-2px] hover:shadow-xl hover:shadow-emerald-400/10',
};

const toneBorder = (tone: PlanCardProps['tone'], isCurrent: boolean): string => {
  if (isCurrent && tone === 'enterprise') return 'border-emerald-400/60';
  if (isCurrent)                          return 'border-emerald-400/40';
  if (tone === 'enterprise')              return 'border-emerald-400/25';
  return 'border-white/[0.08]';
};

export const PlanCard = ({
  tone, icon, name, tagline, features,
  priceMonthly, customPriceLabel, isCurrent, ribbon, cta, promoChip,
}: PlanCardProps) => {
  const isFree = tone === 'free';
  const chromeClass = isCurrent
    ? 'border-2 border-emerald-400/70 shadow-[0_0_0_4px_rgba(16,185,129,0.08),0_18px_40px_-20px_rgba(16,185,129,0.4)]'
    : `border ${toneBorder(tone, isCurrent)} ${toneHover[tone]}`;
  return (
    <div
      className={`relative h-full ${isFree ? 'bg-white/[0.02] opacity-95' : 'bg-white/[0.03]'} rounded-2xl p-5 sm:p-6 flex flex-col transition-all duration-200 ${chromeClass}`}
    >
      {ribbon === 'current' && (
        <motion.div
          layoutId="current-plan-ribbon"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 sm:left-5 sm:translate-x-0 px-3 py-1 rounded-full bg-emerald-400 text-black text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5 shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400/30 whitespace-nowrap z-10"
        >
          <CheckCircle2 size={10} className="shrink-0" />
          <span>Current</span>
        </motion.div>
      )}
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-[13px] font-black text-white tracking-tight">{name}</span>
      </div>
      <p className="text-[11px] font-bold text-white/50 mb-5 min-h-[32px]">{tagline}</p>

      <div className="flex items-baseline gap-1 mb-5 flex-wrap">
        {customPriceLabel ? (
          <span className="text-4xl sm:text-5xl font-black text-white">{customPriceLabel}</span>
        ) : priceMonthly === 0 ? (
          <>
            <span className={`${isFree ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'} font-black text-white/90`}>₹0</span>
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest ml-1">forever</span>
          </>
        ) : (
          <>
            <span className="text-4xl sm:text-5xl font-black text-white">₹{priceMonthly ?? 0}</span>
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest ml-1">/mo</span>
          </>
        )}
      </div>

      {promoChip && <div className="mb-4 -mt-2">{promoChip}</div>}

      <FeatureList features={features} />
      {cta}
    </div>
  );
};

export interface PaidPlanCardProps {
  tone:               'pro' | 'proMax';
  icon:               React.ReactNode;
  name:               string;
  tagline:            string;
  features:           readonly string[];
  monthly:            PlanCatalogItem | undefined;
  quarterly:          PlanCatalogItem | undefined;
  fallbackMonthly:    number;
  fallbackQuarterly:  number;
  isCurrentMonthly:   boolean;
  isCurrentQuarterly: boolean;
  recommended:        boolean;
  topPick:            boolean;
  onCheckout:         (args: {
    cycle:        BillingCycle;
    priceDisplay: number;
    basePrice:    number;
    offerType:    OfferType;
    discountPct:  number;
  }) => void;
}

export const PaidPlanCard = ({
  tone, icon, name, tagline, features, monthly, quarterly,
  fallbackMonthly, fallbackQuarterly,
  isCurrentMonthly, isCurrentQuarterly,
  recommended, topPick, onCheckout,
}: PaidPlanCardProps) => {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  const active         = cycle === 'monthly' ? monthly : quarterly;
  const basePriceMonthly   = monthly?.priceDisplay   ?? fallbackMonthly;
  const basePriceQuarterly = quarterly?.priceDisplay ?? fallbackQuarterly;
  const basePrice      = cycle === 'monthly' ? basePriceMonthly : basePriceQuarterly;

  const displayMonthly   = monthly?.displayPrice   ?? basePriceMonthly;
  const displayQuarterly = quarterly?.displayPrice ?? basePriceQuarterly;
  const shown          = cycle === 'monthly' ? displayMonthly : displayQuarterly;

  const perMonthDisplay = active?.perMonthDisplay
    ?? (cycle === 'monthly' ? displayMonthly : Math.round(displayQuarterly / 3));
  const saveDisplay = active?.saveDisplay ?? Math.max(0, basePrice - shown);

  const isCurrent      = cycle === 'monthly' ? isCurrentMonthly : isCurrentQuarterly;
  const isAnyCurrent   = isCurrentMonthly || isCurrentQuarterly;

  const offer          = active?.offer;
  const hasOffer       = !!offer && offer.offerType !== 'none' && shown < basePrice;

  const accentBtn = tone === 'pro'
    ? 'bg-accent-blue hover:bg-accent-blue/90'
    : 'bg-accent-pink hover:bg-accent-pink/90';

  let chromeClass: string;
  if (isAnyCurrent) {
    chromeClass = 'border-2 border-emerald-400/70 shadow-[0_0_0_4px_rgba(16,185,129,0.08),0_18px_40px_-20px_rgba(16,185,129,0.4)]';
  } else if (topPick) {
    chromeClass = 'border-2 border-accent-pink/70 shadow-[0_0_0_4px_rgba(236,72,153,0.08),0_18px_40px_-20px_rgba(236,72,153,0.4)] sm:scale-[1.02]';
  } else {
    chromeClass = 'border border-white/[0.08] hover:border-white/[0.14]';
  }

  return (
    <div
      className={`relative h-full bg-[#0c0c0f] rounded-2xl p-5 sm:p-6 flex flex-col transition-all duration-200 ${chromeClass}`}
    >
      {recommended && !isAnyCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:left-5 sm:translate-x-0 px-3 py-1 rounded-full bg-accent-pink text-white text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5 shadow-[0_6px_20px_-4px_rgba(236,72,153,0.6)] ring-1 ring-accent-pink/30 whitespace-nowrap z-10">
          <Sparkles size={10} className="fill-white shrink-0" />
          <span>Recommended</span>
        </div>
      )}
      {isAnyCurrent && (
        <motion.div
          layoutId="current-plan-ribbon"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 sm:left-5 sm:translate-x-0 px-3 py-1 rounded-full bg-emerald-400 text-black text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5 shadow-[0_6px_20px_-4px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400/30 whitespace-nowrap z-10"
        >
          <CheckCircle2 size={10} className="shrink-0" />
          <span>Current</span>
        </motion.div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-[13px] font-black text-white tracking-tight">{name}</span>
      </div>
      <p className="text-[11px] font-bold text-white/50 mb-4 min-h-[32px]">{tagline}</p>

      <PricingToggle cycle={cycle} onChange={setCycle} layoutIdPrefix={tone} />

      {cycle === 'quarterly' && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-accent-pink bg-accent-pink/10 border border-accent-pink/30 rounded-md px-2 py-0.5">
            Save 10% a month
          </span>
        </div>
      )}

      <PriceBlock
        displayPrice={shown}
        basePrice={basePrice}
        perMonthDisplay={perMonthDisplay}
        saveDisplay={saveDisplay}
        cycle={cycle}
        hasOffer={hasOffer}
        discountPct={offer?.discountPct ?? 0}
      />

      <FeatureList features={features} />

      {isCurrent ? (
        <button
          disabled
          className="w-full py-3 min-h-[44px] rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 font-black text-xs uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          Manage <ArrowRight size={12} />
        </button>
      ) : (
        <button
          onClick={() => onCheckout({
            cycle,
            priceDisplay: shown,
            basePrice,
            offerType:    offer?.offerType   ?? 'none',
            discountPct:  offer?.discountPct ?? 0,
          })}
          className={`w-full py-3 min-h-[44px] rounded-xl ${accentBtn} text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5`}
        >
          Upgrade to {name} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
};
