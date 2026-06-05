import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Crown, Building2, Gift, Tag, Calendar, RotateCcw,
} from 'lucide-react';
import {
  subscriptionApi,
  type PlanCatalogResponse,
  type SubscriptionPlan,
} from '../services/api/index.js';
import type { PlanCatalogViewer } from '../services/api/subscription.api.js';
import { SEO } from '../components/common/SEO.js';
import { useSubscription } from '../components/chat/hooks/useSubscription.js';
import {
  Ring, BucketBar, PlanIcon, planLabel, planAccent,
  resolveLimits, buildBuckets,
} from '../components/chat/components/TokenUsageBadge.js';
import { PricingToggle }  from './subscription/PricingToggle.js';
import { PriceBlock }     from './subscription/PriceBlock.js';
import { EnterpriseForm } from './subscription/EnterpriseForm.js';
import { BoosterCheckoutModal, type BoosterProduct } from './subscription/BoosterCheckoutModal.js';
import { CheckoutModal } from './subscription/CheckoutModal.js';
import { PlanCardAnimated, PlanCard, PaidPlanCard } from './subscription/PlanCards.js';
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


// ── Booster products ──────────────────────────────────────────────────────

const BOOSTER_PRODUCTS = {
  sparks_sm:  { id: 'sparks_sm',  name: '50K Chat Sparks',    tokenType: 'chat'  as const, amount: 50_000,    price: 199 },
  sparks_md:  { id: 'sparks_md',  name: '200K Chat Sparks',   tokenType: 'chat'  as const, amount: 200_000,   price: 599 },
  sparks_lg:  { id: 'sparks_lg',  name: '1M Chat Sparks',     tokenType: 'chat'  as const, amount: 1_000_000, price: 1999 },
  credits_sm: { id: 'credits_sm', name: '25K Nexus Credits',  tokenType: 'nexus' as const, amount: 25_000,    price: 299 },
  credits_md: { id: 'credits_md', name: '100K Nexus Credits', tokenType: 'nexus' as const, amount: 100_000,   price: 899 },
  credits_lg: { id: 'credits_lg', name: '500K Nexus Credits', tokenType: 'nexus' as const, amount: 500_000,   price: 2499 },
} as const;

// ── Page ───────────────────────────────────────────────────────────────────

export const Subscription = () => {
  const { sub, plan, remaining, refresh } = useSubscription();

  const [plans,    setPlans]    = useState<PlanCatalogResponse['plans'] | null>(null);
  const [viewer,   setViewer]   = useState<PlanCatalogViewer | null>(null);
  const [target,   setTarget]   = useState<PaidCheckoutTarget | null>(null);
  const [entForm,  setEntForm]  = useState<boolean>(false);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [boosterTarget, setBoosterTarget] = useState<BoosterProduct | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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

  const handleCancel = async () => {
    if (!window.confirm('Cancel auto-renew? Your plan stays active until expiry.')) return;
    setCancelLoading(true);
    try {
      await subscriptionApi.cancel();
      await doRefresh();
    } catch {
      // ignore
    } finally {
      setCancelLoading(false);
    }
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
      <SEO 
        title="Subscription Plans" 
        description="Choose the right plan for your needs. Explore Pro and Pro Max plans for premium features." 
      />
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
                {plan !== 'free' && sub?.status === 'active' && (
                  <button
                    onClick={() => void handleCancel()}
                    disabled={cancelLoading}
                    className="inline-flex items-center gap-1 text-[10px] font-black text-white/30 hover:text-red-400 uppercase tracking-widest transition-colors disabled:opacity-40"
                  >
                    <RotateCcw size={9} />
                    {cancelLoading ? 'Cancelling…' : 'Cancel auto-renew'}
                  </button>
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
                      icon={<img src="/chat_sparks.png" className="w-5 h-5 object-contain opacity-70" alt="" />}
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
                    icon={<Calendar size={16} className="opacity-60" />}
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

        {/* ── Token Booster packs ──────────────────────────────────────────── */}
        {plan !== 'free' && (
          <section className="mt-12">
            <div className="mb-4">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Add-ons</span>
              <h2 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">Token Boosters</h2>
              <p className="mt-1 text-[12px] text-white/40 font-bold">One-time top-ups. Credits added instantly after payment.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(BOOSTER_PRODUCTS).map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-3 hover:border-white/[0.15] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={b.tokenType === 'chat' ? '/chat_sparks.png' : '/nexus_credits.png'}
                      className="w-7 h-7 object-contain"
                      alt={b.tokenType}
                    />
                    <div>
                      <div className="text-[11px] font-black text-white/50 uppercase tracking-widest">
                        {b.tokenType === 'chat' ? 'Chat Sparks' : 'Nexus Credits'}
                      </div>
                      <div className="text-[13px] font-black text-white">{b.name}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-white/40">
                    +{b.amount.toLocaleString()} tokens added to your pool
                  </div>
                  <button
                    onClick={() => setBoosterTarget(b)}
                    className="mt-auto w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/[0.1] transition-all"
                  >
                    ₹{b.price.toLocaleString('en-IN')} — Add Now
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

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
          {entForm && (
            <EnterpriseForm
              onClose={() => setEntForm(false)}
              onSuccess={() => { setEntForm(false); }}
            />
          )}
          {boosterTarget && (
            <BoosterCheckoutModal
              booster={boosterTarget}
              onClose={() => setBoosterTarget(null)}
              onSuccess={() => {
                setBoosterTarget(null);
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

const HeroRing = ({ label, pct, caption, tone, accentClass, icon }: {
  label: string; pct: number; caption: string; tone: 'accent' | 'amber'; accentClass: string;
  icon?: React.ReactNode;
}) => (
  <div className={`flex items-center gap-3 ${tone === 'amber' ? 'text-amber-400' : accentClass}`}>
    <div className="relative">
      <Ring pct={pct} size={52} stroke={4} tone={tone} />
      {icon && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {icon}
        </span>
      )}
    </div>
    <div>
      <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em]">{label}</div>
      <div className="text-[12px] font-black text-white tabular-nums">{caption}</div>
    </div>
  </div>
);
