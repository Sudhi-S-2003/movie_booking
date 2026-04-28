import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Crown, Building2, Lock, Loader2, CheckCircle2,
  AlertCircle, X, ArrowRight, Gift, Tag,
} from 'lucide-react';
import {
  subscriptionApi,
  type PlanCatalogResponse,
  type PlanCatalogItem,
  type BillingCycle,
  type PaidPlan,
  type SubscriptionPlan,
} from '../services/api/index.js';
import type { OfferType, PlanCatalogViewer } from '../services/api/subscription.api.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useSubscription } from '../components/chat/hooks/useSubscription.js';
import { usePaymentFlow, type PaymentStep } from '../hooks/usePaymentFlow.js';
import { usePaymentMethodForm, type UsePaymentMethodForm } from '../hooks/usePaymentMethodForm.js';
import type { PaymentMethodInput } from '../types/api.js';
import {
  Ring, BucketBar, PlanIcon, planLabel, planAccent,
  resolveLimits, buildBuckets,
} from '../components/chat/components/TokenUsageBadge.js';
import { PricingToggle }  from './subscription/PricingToggle.js';
import { PriceBlock }     from './subscription/PriceBlock.js';
import { FeatureList }    from './subscription/FeatureList.js';
import { SkeletonCard }   from './subscription/SkeletonCard.js';
import { FaqAccordion }   from './subscription/FaqAccordion.js';
import { TrustSignals }   from './subscription/TrustSignals.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtDaysLeft = (iso: string | null): string => {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? '' : 's'} left`;
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const billingRingPct = (startsAt?: string | null, expiresAt?: string | null): number => {
  if (!startsAt || !expiresAt) return 1;
  const start = new Date(startsAt).getTime();
  const end   = new Date(expiresAt).getTime();
  const now   = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  const remaining = Math.max(0, end - now);
  return Math.max(0, Math.min(1, remaining / (end - start)));
};

/**
 * Human-friendly "when does this bucket roll over" caption.
 *
 * Reads the real `resetAt` timestamp the server ships per bucket — no
 * guessing about calendar boundaries. Falls back to a generic label if the
 * value is missing (shouldn't happen in practice).
 *
 * Semantics:
 *   • daily   → resets at UTC midnight
 *   • weekly  → resets Sunday 00:00 UTC
 *   • monthly → 30-day rolling window (not calendar month). We show the
 *               exact days-remaining for clarity.
 */
const rolloverCaption = (
  key: 'daily' | 'weekly' | 'monthly',
  resetAtIso?: string,
): string => {
  if (!resetAtIso) {
    if (key === 'daily')  return 'Rolls over at 12:00 AM';
    if (key === 'weekly') return 'Rolls over Sunday';
    return 'Rolls over every 30 days';
  }

  const resetAt = new Date(resetAtIso);
  if (Number.isNaN(resetAt.getTime())) return 'Rolls over soon';

  const ms   = resetAt.getTime() - Date.now();
  const mins = Math.max(0, Math.round(ms / 60000));
  const hrs  = Math.max(0, Math.round(ms / 3_600_000));
  const days = Math.max(0, Math.ceil(ms / 86_400_000));

  if (key === 'daily') {
    if (mins < 60) return `Rolls over in ${mins}m`;
    if (hrs  < 24) return `Rolls over in ${hrs}h`;
    return 'Rolls over at 12:00 AM';
  }
  if (key === 'weekly') {
    if (days <= 1) return 'Rolls over today';
    if (days <= 7) return `Rolls over in ${days} days`;
    return 'Rolls over Sunday';
  }
  // monthly = 30-day rolling
  return days <= 1
    ? 'Rolls over today'
    : `Rolls over in ${days} day${days === 1 ? '' : 's'}`;
};

const statusChip = (plan: SubscriptionPlan, status: string | undefined): string => {
  if (status === 'expired')   return 'bg-amber-400/10 text-amber-300 border-amber-400/30';
  if (status === 'cancelled') return 'bg-slate-400/10 text-slate-300 border-slate-400/30';
  if (plan === 'enterprise')  return 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30';
  if (plan === 'proMax')      return 'bg-accent-pink/15 text-accent-pink border-accent-pink/40';
  if (plan === 'pro')         return 'bg-accent-pink/10 text-accent-pink border-accent-pink/30';
  return 'bg-white/[0.04] text-white/60 border-white/[0.08]';
};

interface PaidCheckoutTarget {
  plan:         PaidPlan;
  cycle:        BillingCycle;
  priceDisplay: number;
  /** Original pre-promo price; equals priceDisplay when no offer. */
  basePrice:    number;
  offerType:    OfferType;
  discountPct:  number;
}

interface EnterpriseCheckoutTarget {
  monthlyLimit:   number;
  durationMonths: number;
  priceDisplay:   number;
  discountPct:    number;
}

// ── Page ───────────────────────────────────────────────────────────────────

export const Subscription = () => {
  useDocumentTitle('Subscription');
  const { sub, plan, remaining, refresh } = useSubscription();

  const [plans,    setPlans]    = useState<PlanCatalogResponse['plans'] | null>(null);
  const [viewer,   setViewer]   = useState<PlanCatalogViewer | null>(null);
  const [target,   setTarget]   = useState<PaidCheckoutTarget | null>(null);
  const [entForm,  setEntForm]  = useState<boolean>(false);
  const [entTarget, setEntTarget] = useState<EnterpriseCheckoutTarget | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    subscriptionApi.getPlans()
      .then((r) => {
        setPlans(r.plans);
        if (r.viewer) setViewer(r.viewer);
      })
      .catch(() => { });
  }, []);

  // Bump the "updated just now" hint whenever the remaining buckets change.
  useEffect(() => { setLastUpdated(Date.now()); }, [remaining]);

  const doRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const isCurrent = (p: PaidPlan, cycle: BillingCycle) =>
    plan === p && sub?.billingCycle === cycle;

  const limits  = useMemo(() => resolveLimits(plan, sub), [plan, sub]);
  const buckets = useMemo(() => buildBuckets(plan, remaining, limits), [plan, remaining, limits]);
  const billingPct = billingRingPct(sub?.startsAt, sub?.expiresAt);

  const accent = planAccent(plan);

  const proIsTopPick = plan === 'free' && viewer?.offerType === 'firstOrder';
  const plansLoaded  = !!plans;

  return (
    <div className="min-h-[100dvh] bg-[#09090b] py-6 sm:py-10 px-3 sm:px-4 overflow-x-hidden">
      {/* Thin pink progress bar during post-success refresh */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            key="refresh-bar"
            initial={{ scaleX: 0, opacity: 0.9 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{ transformOrigin: 'left' }}
            className="fixed top-0 inset-x-0 h-[2px] bg-accent-pink z-[60]"
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">

        {/* ── Hero band ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 sm:p-6 md:p-8 mb-8">
          <div className="absolute -top-16 -right-16 w-40 h-40 sm:-top-24 sm:-right-24 sm:w-64 sm:h-64 rounded-full bg-accent-pink/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:flex-wrap lg:items-start lg:justify-between gap-6">
            <div className="min-w-0">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Billing</span>
              <h1 className="mt-1 text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">Plans</h1>
              <p className="mt-2 text-[12px] font-bold text-white/50 max-w-md">
                Pay for what you use. Change plans any time.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-[0.25em] ${statusChip(plan, sub?.status)}`}>
                  <PlanIcon plan={plan} /> {planLabel(plan)}
                  {sub?.status && sub.status !== 'active' && <span className="opacity-80">· {sub.status}</span>}
                </span>
                {plan !== 'free' && sub?.expiresAt && (
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    {fmtDaysLeft(sub.expiresAt)} · {fmtDate(sub.expiresAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Right side: rings — wraps below on MD-, right-aligned on LG+ */}
            <div className="flex items-center gap-5 overflow-x-auto snap-x snap-mandatory lg:flex-wrap lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
              {plan === 'free' ? (
                buckets.map((b) => (
                  <div key={b.key} className="snap-start shrink-0">
                    <HeroRing
                      label={b.label}
                      pct={b.pct}
                      caption={`${b.remaining.toLocaleString()} / ${b.total.toLocaleString()}`}
                      tone={b.pct <= 0.1 ? 'amber' : 'accent'}
                      accentClass={accent}
                    />
                  </div>
                ))
              ) : (
                <div className="snap-start shrink-0">
                  <HeroRing
                    label="Billing period"
                    pct={billingPct}
                    caption={sub?.expiresAt ? fmtDaysLeft(sub.expiresAt) : '—'}
                    tone="accent"
                    accentClass={accent}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Promo hero banner ────────────────────────────────────── */}
        {viewer && viewer.offerType !== 'none' && (
          <PromoBanner offerType={viewer.offerType} discountPct={viewer.discountPct} />
        )}

        {/* ── Pricing grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {!plansLoaded ? (
            <>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </>
          ) : (
            <>
              <PlanCardAnimated delay={0}>
                <PlanCard
                  tone="free"
                  icon={<Zap size={18} className="text-emerald-400" />}
                  name={plans.free.name}
                  tagline="For casual use"
                  features={plans.free.features}
                  priceMonthly={0}
                  priceQuarterly={null}
                  isCurrent={plan === 'free'}
                  ribbon={plan === 'free' ? 'current' : null}
                  cta={null}
                />
              </PlanCardAnimated>

              <PlanCardAnimated delay={0.05}>
                <PaidPlanCard
                  tone="pro"
                  icon={<Sparkles size={18} className="text-accent-blue" />}
                  name="Pro"
                  tagline={plans.proMonthly.description}
                  features={plans.proMonthly.features}
                  monthly={plans.proMonthly}
                  quarterly={plans.proQuarterly}
                  fallbackMonthly={499}
                  fallbackQuarterly={1349}
                  isCurrentMonthly={isCurrent('pro', 'monthly')}
                  isCurrentQuarterly={isCurrent('pro', 'quarterly')}
                  recommended={plan === 'free'}
                  topPick={proIsTopPick}
                  onCheckout={(a) => setTarget({ plan: 'pro', ...a })}
                />
              </PlanCardAnimated>

              <PlanCardAnimated delay={0.1}>
                <PaidPlanCard
                  tone="proMax"
                  icon={<Crown size={18} className="text-accent-pink" />}
                  name="Pro Max"
                  tagline={plans.proMaxMonthly.description}
                  features={plans.proMaxMonthly.features}
                  monthly={plans.proMaxMonthly}
                  quarterly={plans.proMaxQuarterly}
                  fallbackMonthly={1499}
                  fallbackQuarterly={4049}
                  isCurrentMonthly={isCurrent('proMax', 'monthly')}
                  isCurrentQuarterly={isCurrent('proMax', 'quarterly')}
                  recommended={false}
                  topPick={false}
                  onCheckout={(a) => setTarget({ plan: 'proMax', ...a })}
                />
              </PlanCardAnimated>

              <PlanCardAnimated delay={0.15}>
                <PlanCard
                  tone="enterprise"
                  icon={<Building2 size={18} className="text-emerald-400" />}
                  name={plans.enterprise.name}
                  tagline={plans.enterprise.description}
                  features={plans.enterprise.features}
                  priceMonthly={null}
                  priceQuarterly={null}
                  customPriceLabel="Custom"
                  isCurrent={plan === 'enterprise'}
                  ribbon={plan === 'enterprise' ? 'current' : null}
                  promoChip={viewer && viewer.offerType !== 'none' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-md px-2 py-1">
                      <Tag size={9} /> Same {viewer.discountPct}% discount applies
                    </span>
                  ) : undefined}
                  cta={
                    <button
                      onClick={() => setEntForm(true)}
                      disabled={plan === 'enterprise'}
                      className="w-full mt-4 py-3 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {plan === 'enterprise' ? 'Active' : 'Contact sales'}
                    </button>
                  }
                />
              </PlanCardAnimated>
            </>
          )}
        </div>

        {/* ── Footer trust signals ────────────────────────────────── */}
        <TrustSignals />
        <p className="mt-3 text-[10px] text-white/30 text-center">
          Discounts apply at checkout. You can cancel anytime.
        </p>

        {/* ── Live usage section ──────────────────────────────────── */}
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Usage</span>
              <h2 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">
                Usage
              </h2>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={lastUpdated}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] font-black text-white/35 uppercase tracking-[0.25em]"
              >
                Updated
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            {buckets.length === 0 ? (
              <p className="text-[12px] font-bold text-white/40">No usage limits on this plan.</p>
            ) : (
              <div className={`grid gap-6 ${accent} ${
                buckets.length === 1 ? 'grid-cols-1' :
                buckets.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                                       'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {buckets.map((b) => (
                  <div key={b.key} className="flex items-start gap-4">
                    <span className={b.pct <= 0.1 ? 'text-amber-400' : accent}>
                      <Ring pct={b.pct} size={44} stroke={4} tone={b.pct <= 0.1 ? 'amber' : 'accent'} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <BucketBar bucket={b} tone={b.pct <= 0.1 ? 'amber' : 'accent'} />
                      <p className="mt-1 text-[9px] font-black text-white/35 uppercase tracking-[0.2em]">
                        {rolloverCaption(b.key, remaining?.resetAt?.[b.key])}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <FaqAccordion />

        <AnimatePresence>
          {target && (
            <CheckoutModal
              plan={target.plan}
              cycle={target.cycle}
              priceDisplay={target.priceDisplay}
              basePrice={target.basePrice}
              offerType={target.offerType}
              discountPct={target.discountPct}
              onClose={() => setTarget(null)}
              onSuccess={() => {
                setTarget(null);
                void doRefresh();
              }}
            />
          )}
          {entForm && !entTarget && (
            <EnterpriseForm
              onClose={() => setEntForm(false)}
              onSubmit={(t) => { setEntForm(false); setEntTarget(t); }}
            />
          )}
          {entTarget && (
            <EnterpriseCheckoutModal
              target={entTarget}
              onClose={() => setEntTarget(null)}
              onSuccess={() => {
                setEntTarget(null);
                void doRefresh();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Promo banner ────────────────────────────────────────────────────────────

const PromoBanner = ({ offerType, discountPct }: { offerType: OfferType; discountPct: number }) => {
  const isFirst = offerType === 'firstOrder';
  // NOTE: gradient stops eyeballed — there aren't named tokens for these combos.
  const gradient = isFirst
    ? 'from-accent-pink/25 via-fuchsia-500/15 to-accent-blue/25'
    : 'from-emerald-400/25 via-teal-400/15 to-accent-blue/25';
  const border = isFirst ? 'border-accent-pink/30' : 'border-emerald-400/30';
  const Icon   = isFirst ? Gift : Tag;
  const eyebrow = isFirst ? 'Welcome offer' : 'Welcome back';
  const copy = isFirst
    ? `${discountPct}% off your first paid plan — redeem on any plan below.`
    : `${discountPct}% off your next plan.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-r ${gradient} mb-6`}
      style={{ maxHeight: 88 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            isFirst ? 'bg-accent-pink/25 text-accent-pink' : 'bg-emerald-400/25 text-emerald-300'
          }`}>
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">{eyebrow}</div>
            <div className="text-[12px] sm:text-[13px] font-black text-white truncate">{copy}</div>
          </div>
        </div>
        <div className="hidden sm:flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
          Applied at checkout <ArrowRight size={10} />
        </div>
      </div>
    </motion.div>
  );
};

// ── Hero ring ───────────────────────────────────────────────────────────────

const HeroRing = ({ label, pct, caption, tone, accentClass }: {
  label: string; pct: number; caption: string; tone: 'accent' | 'amber'; accentClass: string;
}) => (
  <div className={`flex items-center gap-3 ${tone === 'amber' ? 'text-amber-400' : accentClass}`}>
    <Ring pct={pct} size={52} stroke={4} tone={tone} />
    <div>
      <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em]">{label}</div>
      <div className="text-[12px] font-black text-white tabular-nums">{caption}</div>
    </div>
  </div>
);

// ── Stagger wrapper ────────────────────────────────────────────────────────

const PlanCardAnimated = ({ children, delay }: { children: React.ReactNode; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    className="h-full"
  >
    {children}
  </motion.div>
);

// ── Generic plan card (Free / Enterprise) ──────────────────────────────────

interface PlanCardProps {
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

/**
 * Per-tone card chrome.
 *
 * `free` is deliberately quiet: no hover lift, desaturated, smaller price.
 * `enterprise` wears an emerald border so it reads as distinct from the
 * consumer (pink/blue) tiers. Pro/proMax don't come through here — they use
 * the paid-plan card below.
 */
const toneHover: Record<PlanCardProps['tone'], string> = {
  free:       '',                                  // no lift, no shadow
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

const PlanCard = ({
  tone, icon, name, tagline, features,
  priceMonthly, customPriceLabel, isCurrent, ribbon, cta, promoChip,
}: PlanCardProps) => {
  const isFree = tone === 'free';
  // Match PaidPlanCard's halo styling so the emerald "current" treatment is
  // consistent across every tier.
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

// ── Paid plan card with monthly/quarterly toggle ───────────────────────────

interface PaidPlanCardProps {
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
  /**
   * Light up this card as the "star" — gradient border + glow + slight scale.
   * Meant only for Pro when the user is on Free AND has the first-order offer.
   */
  topPick:            boolean;
  onCheckout:         (args: {
    cycle:        BillingCycle;
    priceDisplay: number;
    basePrice:    number;
    offerType:    OfferType;
    discountPct:  number;
  }) => void;
}

const PaidPlanCard = ({
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

  // Prefer the server's collapsed `displayPrice` (post-promo) when available.
  const displayMonthly   = monthly?.displayPrice   ?? basePriceMonthly;
  const displayQuarterly = quarterly?.displayPrice ?? basePriceQuarterly;
  const shown          = cycle === 'monthly' ? displayMonthly : displayQuarterly;

  // Server-provided normalized per-month price (quarterly → already divided by 3).
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

  /**
   * Card chrome ─ three mutually-exclusive treatments, in priority order:
   *   1. `isAnyCurrent` (emerald)   — you already own this
   *   2. `topPick`      (pink solid) — we recommend it right now
   *   3. neutral
   *
   * The previous design used a `before:` pseudo-element with `-z-10` for a
   * gradient border; that rendered behind the solid card background and was
   * invisible. Replaced with a real border + a real box-shadow halo, which
   * reads cleanly at every breakpoint.
   */
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

// ── Enterprise configuration form ──────────────────────────────────────────

const EnterpriseForm = ({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (t: EnterpriseCheckoutTarget) => void;
}) => {
  const [monthlyLimit, setMonthlyLimit]     = useState<string>('1000000');
  const [durationMonths, setDurationMonths] = useState<string>('6');
  const [quote, setQuote]  = useState<{ priceDisplay: number; discountPct: number } | null>(null);
  const [error, setError]  = useState<string | null>(null);

  useEffect(() => {
    const limit    = Number(monthlyLimit);
    const duration = Number(durationMonths);
    const inputsValid =
      Number.isFinite(limit) && limit >= 100_000 &&
      Number.isInteger(duration) && duration >= 1 && duration <= 12;

    if (!inputsValid) { setQuote(null); return; }

    let cancelled = false;
    subscriptionApi.enterpriseQuote(limit, duration)
      .then((res) => {
        if (cancelled) return;
        setQuote({ priceDisplay: res.priceDisplay, discountPct: res.discountPct });
      })
      .catch(() => { if (!cancelled) setQuote(null); });

    return () => { cancelled = true; };
  }, [monthlyLimit, durationMonths]);

  const submit = () => {
    const limit    = Number(monthlyLimit);
    const duration = Number(durationMonths);

    if (!Number.isFinite(limit) || limit < 100_000) {
      setError('Monthly limit must be at least 100,000 tokens.'); return;
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 12) {
      setError('Duration must be an integer from 1 to 12 months.'); return;
    }
    if (!quote) {
      setError('Waiting for price — try again in a moment.'); return;
    }
    setError(null);
    onSubmit({
      monthlyLimit:   limit,
      durationMonths: duration,
      priceDisplay:   quote.priceDisplay,
      discountPct:    quote.discountPct,
    });
  };

  return (
    <ModalShell onClose={onClose} heading="Enterprise" subheading="Custom terms" accent="emerald">
      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Monthly limit</span>
          <input
            type="number" min={100_000} value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Duration (months, 1–12)</span>
          <input
            type="number" min={1} max={12} value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-emerald-400/40"
          />
        </label>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Total</div>
          {quote ? (
            <>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">
                  ₹{quote.priceDisplay.toLocaleString('en-IN')}
                </span>
                {quote.discountPct > 0 && (
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                    {quote.discountPct}% off
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-white/40">
                Based on ₹0.0007 per token per month, with a bulk discount for longer contracts.
              </p>
            </>
          ) : (
            <div className="mt-1 text-[11px] font-bold text-white/30">Enter valid limit and duration…</div>
          )}
        </div>

        {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={!quote}
          className="w-full py-3 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continue to payment
        </button>
      </div>
    </ModalShell>
  );
};

// ── Modal shell (shared look) ──────────────────────────────────────────────

const ModalShell = ({
  onClose, heading, subheading, accent, children,
}: {
  onClose: () => void;
  heading: string;
  subheading: string;
  accent: 'pink' | 'emerald' | 'blue';
  children: React.ReactNode;
}) => {
  const accentBar =
    accent === 'pink'    ? 'bg-accent-pink' :
    accent === 'emerald' ? 'bg-emerald-400' :
                           'bg-accent-blue';
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-[#0c0c0c] border border-white/[0.1] rounded-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <div className={`h-[3px] w-full ${accentBar} opacity-80 sticky top-0 z-10`} />
        <div className="p-5 sm:p-6">
          <button onClick={onClose} aria-label="Close" className="absolute top-2 right-2 sm:top-3 sm:right-3 w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
          <h2 className="text-xl font-black text-white">{heading}</h2>
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{subheading}</p>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Checkout modals ────────────────────────────────────────────────────────

interface CheckoutModalProps {
  plan:         PaidPlan;
  cycle:        BillingCycle;
  priceDisplay: number;
  basePrice:    number;
  offerType:    OfferType;
  discountPct:  number;
  onClose:      () => void;
  onSuccess:    () => void;
}

const CheckoutModal = ({
  plan, cycle, priceDisplay, basePrice, offerType, discountPct, onClose, onSuccess,
}: CheckoutModalProps) => {
  const form = usePaymentMethodForm();
  const { paymentStep, errorMessage, startPayment, reset } = usePaymentFlow({
    createIntent: async () => {
      const res = await subscriptionApi.checkout(plan, cycle);
      return {
        paymentIntentId: res.paymentIntentId,
        clientSecret:    res.clientSecret,
        amount:          res.amount,
        currency:        res.currency,
      };
    },
    confirm: async (paymentIntentId, method) => {
      const { paymentsApi } = await import('../services/api/index.js');
      return paymentsApi.confirm(paymentIntentId, method);
    },
    onSuccess: () => { setTimeout(onSuccess, 1200); },
  });

  const heading = plan === 'proMax' ? 'Upgrade to Pro Max' : 'Upgrade to Pro';

  return (
    <PaymentShell
      heading={heading}
      subheading={cycle === 'monthly' ? 'Monthly cycle' : 'Quarterly cycle — 10% off'}
      priceDisplay={priceDisplay}
      basePrice={basePrice}
      offerType={offerType}
      discountPct={discountPct}
      accent={plan === 'proMax' ? 'pink' : 'blue'}
      form={form}
      paymentStep={paymentStep}
      errorMessage={errorMessage}
      startPayment={startPayment}
      reset={reset}
      successMessage={`You're on ${plan === 'proMax' ? 'Pro Max' : 'Pro'}`}
      onClose={onClose}
    />
  );
};

const EnterpriseCheckoutModal = ({ target, onClose, onSuccess }: {
  target:    EnterpriseCheckoutTarget;
  onClose:   () => void;
  onSuccess: () => void;
}) => {
  const form = usePaymentMethodForm();
  const { paymentStep, errorMessage, startPayment, reset } = usePaymentFlow({
    createIntent: async () => {
      const res = await subscriptionApi.enterpriseCheckout({
        monthlyLimit:   target.monthlyLimit,
        durationMonths: target.durationMonths,
      });
      return {
        paymentIntentId: res.paymentIntentId,
        clientSecret:    res.clientSecret,
        amount:          res.amount,
        currency:        res.currency,
      };
    },
    confirm: async (paymentIntentId, method) => {
      const { paymentsApi } = await import('../services/api/index.js');
      return paymentsApi.confirm(paymentIntentId, method);
    },
    onSuccess: () => { setTimeout(onSuccess, 1200); },
  });

  return (
    <PaymentShell
      heading="Enterprise"
      subheading={`${target.monthlyLimit.toLocaleString()} tokens / month · ${target.durationMonths} month${target.durationMonths === 1 ? '' : 's'}`}
      priceDisplay={target.priceDisplay}
      accent="emerald"
      form={form}
      paymentStep={paymentStep}
      errorMessage={errorMessage}
      startPayment={startPayment}
      reset={reset}
      successMessage="You're on Enterprise"
      onClose={onClose}
    />
  );
};

interface PaymentShellProps {
  heading:         string;
  subheading:      string;
  priceDisplay:    number;
  /** Pre-promo base price — when > priceDisplay, the "offer applied" line shows. */
  basePrice?:      number;
  offerType?:      OfferType;
  discountPct?:    number;
  accent:          'pink' | 'emerald' | 'blue';
  form:            UsePaymentMethodForm;
  paymentStep:     PaymentStep;
  errorMessage:    string;
  startPayment:    (method: PaymentMethodInput) => Promise<void>;
  reset:           () => void;
  successMessage:  string;
  onClose:         () => void;
}

const PaymentShell = ({
  heading, subheading, priceDisplay, basePrice, offerType, discountPct, accent, form,
  paymentStep, errorMessage, startPayment, reset, successMessage, onClose,
}: PaymentShellProps) => {
  const hasOffer = !!offerType && offerType !== 'none' && !!basePrice && basePrice > priceDisplay;
  const savings  = hasOffer && basePrice ? basePrice - priceDisplay : 0;
  const canPay = form.isValid && paymentStep === 'review';
  return (
    <ModalShell onClose={onClose} heading={heading} subheading={subheading} accent={accent}>
      <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex justify-between items-end">
        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Total</span>
        <span className="text-right">
          <span className="block text-2xl font-black text-white tabular-nums">₹{priceDisplay.toLocaleString('en-IN')}</span>
          {hasOffer && (
            <span className="block mt-0.5 text-[10px] font-bold text-white/30 line-through tabular-nums">
              ₹{basePrice!.toLocaleString('en-IN')}
            </span>
          )}
        </span>
      </div>
      {hasOffer && (
        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/25 rounded-xl px-3 py-2">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>
            Offer applied
            {discountPct ? ` (${discountPct}% off)` : ''}
            {' '}— you save ₹{savings.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {paymentStep === 'review' && (
        <div className="mt-5 space-y-3">
          <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1">
            {(['card', 'upi', 'netbanking'] as const).map((m) => (
              <button key={m} onClick={() => form.setMethod(m)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  form.method === m ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >{m}</button>
            ))}
          </div>

          {form.method === 'card' && (
            <div className="space-y-2">
              <input value={form.cardName}   onChange={(e) => form.setCardName(e.target.value)}   placeholder="Cardholder Name" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
              <input value={form.cardNumber} onChange={(e) => form.setCardNumber(e.target.value)} placeholder="Card Number" maxLength={19} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.cardExpiry} onChange={(e) => form.setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
                <input value={form.cardCvc}    onChange={(e) => form.setCardCvc(e.target.value)}    placeholder="CVC" maxLength={4} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
              </div>
              <p className="text-[9px] text-white/30 font-bold">Use 4242 4242 4242 4242 · any future expiry · any CVC</p>
            </div>
          )}

          {form.method === 'upi' && (
            <input value={form.upiId} onChange={(e) => form.setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
          )}

          {form.method === 'netbanking' && (
            <p className="text-[10px] text-white/40 font-bold">Net banking is simulated. Click Pay to continue.</p>
          )}

          <button
            disabled={!canPay}
            onClick={() => void startPayment(form.buildPaymentMethod())}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              canPay ? 'bg-accent-pink text-white hover:bg-accent-pink/90' : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            <Lock size={12} />
            Pay ₹{priceDisplay.toLocaleString('en-IN')}
          </button>
        </div>
      )}

      {paymentStep === 'processing' && (
        <div className="mt-6 flex flex-col items-center py-6">
          <Loader2 size={24} className="animate-spin text-accent-blue mb-3" />
          <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">Loading…</p>
        </div>
      )}

      {paymentStep === 'success' && (
        <div className="mt-6 flex flex-col items-center py-6">
          <CheckCircle2 size={28} className="text-emerald-400 mb-3" />
          <p className="text-[13px] font-black text-white">{successMessage}</p>
        </div>
      )}

      {paymentStep === 'error' && (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <AlertCircle size={24} className="text-red-400 mb-3" />
          <p className="text-[11px] font-bold text-red-400 mb-3">{errorMessage}</p>
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </ModalShell>
  );
};
