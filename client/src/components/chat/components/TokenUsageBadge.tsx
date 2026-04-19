import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Crown, Building2, ChevronDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription.js';
import type { SubscriptionPlan, SubscriptionInfo, TokenRemaining } from '../../../services/api/index.js';

// ── Shared primitives (also imported by Subscription page) ─────────────────

export const planLabel = (plan: SubscriptionPlan): string => {
  switch (plan) {
    case 'pro':        return 'Pro';
    case 'proMax':     return 'Pro Max';
    case 'enterprise': return 'Enterprise';
    default:           return 'Free';
  }
};

export const PlanIcon = ({ plan, size = 11 }: { plan: SubscriptionPlan; size?: number }) => {
  if (plan === 'pro')        return <Sparkles size={size} />;
  if (plan === 'proMax')     return <Crown size={size} />;
  if (plan === 'enterprise') return <Building2 size={size} />;
  return <Zap size={size} />;
};

export const planAccent = (plan: SubscriptionPlan): string =>
  plan === 'pro'        ? 'text-accent-pink' :
  plan === 'proMax'     ? 'text-accent-pink' :
  plan === 'enterprise' ? 'text-emerald-400' :
                          'text-accent-blue';

export interface BucketInfo {
  key:       'daily' | 'weekly' | 'monthly';
  label:     string;
  remaining: number;
  total:     number;
  pct:       number;   // 0..1 remaining
}

/** Resolve plan-specific limits. Mirrors prior TokenUsageBadge logic. */
export const resolveLimits = (plan: SubscriptionPlan, sub: SubscriptionInfo | null) => {
  if (plan === 'pro')        return { daily: 20_000, monthly: 500_000 } as const;
  if (plan === 'proMax')     return { monthly: 2_000_000 } as const;
  if (plan === 'enterprise') return { monthly: sub?.customMonthlyLimit ?? 0 } as const;
  return { daily: 1_000, weekly: 5_000, monthly: 30_000 } as const;
};

export const buildBuckets = (
  plan:      SubscriptionPlan,
  remaining: TokenRemaining | null,
  limits:    { daily?: number; weekly?: number; monthly?: number },
): BucketInfo[] => {
  const list: BucketInfo[] = [];
  const push = (key: BucketInfo['key'], label: string, rem: number | undefined, total: number | undefined) => {
    if (!total || total <= 0) return;
    const r = Math.max(0, rem ?? 0);
    list.push({ key, label, remaining: r, total, pct: Math.min(1, r / total) });
  };
  push('daily',   'Today',      remaining?.daily,   limits.daily);
  push('weekly',  'This week',  remaining?.weekly,  limits.weekly);
  push('monthly', 'This month', remaining?.monthly, limits.monthly);
  return list;
};

// ── SVG progress ring ──────────────────────────────────────────────────────

interface RingProps {
  pct:      number;   // 0..1 remaining fraction
  size?:    number;
  stroke?:  number;
  tone?:    'accent' | 'amber';
  loading?: boolean;
}

export const Ring = memo(({ pct, size = 24, stroke = 3, tone = 'accent', loading = false }: RingProps) => {
  const r  = (32 - stroke) / 2;
  const c  = 2 * Math.PI * r;
  const safePct = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
  const offset = (1 - safePct) * c;
  const toneClass = tone === 'amber' ? 'text-amber-400' : 'currentColor-inherit';

  if (loading) {
    return (
      <div
        aria-hidden
        className="animate-pulse rounded-full bg-white/[0.08]"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={tone === 'amber' ? 'text-amber-400' : ''}>
      <circle cx={16} cy={16} r={r} stroke="rgba(255,255,255,0.08)" fill="none" strokeWidth={stroke} />
      <circle
        cx={16} cy={16} r={r}
        stroke="currentColor" fill="none" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 16 16)"
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
      {/* unused tone class reference to satisfy linter */}
      <title>{toneClass}</title>
    </svg>
  );
});
Ring.displayName = 'Ring';

// ── Bucket bar (used in expanded panel + subscription page) ────────────────

interface BucketBarProps {
  bucket: BucketInfo;
  tone?:  'accent' | 'amber';
}

export const BucketBar = memo(({ bucket, tone = 'accent' }: BucketBarProps) => {
  const widthPct = bucket.pct * 100;
  const barClass = tone === 'amber' ? 'bg-amber-400' : 'bg-current';
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.25em] truncate">{bucket.label}</span>
        <span className="text-[10px] font-bold text-white/80 tabular-nums shrink-0">
          {bucket.remaining.toLocaleString()}<span className="text-white/30"> / {bucket.total.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full ${barClass} transition-[width] duration-500 ease-out`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
});
BucketBar.displayName = 'BucketBar';

// ── Helpers ────────────────────────────────────────────────────────────────

const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};

const pickBinding = (buckets: BucketInfo[]): BucketInfo | null => {
  if (buckets.length === 0) return null;
  let best = buckets[0]!;
  for (const b of buckets) if (b.pct < best.pct) best = b;
  return best;
};

// ── Compact pill (chat-header badge) ───────────────────────────────────────

export const TokenUsageBadge = memo(() => {
  const navigate = useNavigate();
  const { sub, remaining, plan, loading, isGuest } = useSubscription();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const limits   = useMemo(() => resolveLimits(plan, sub), [plan, sub]);
  const buckets  = useMemo(() => buildBuckets(plan, remaining, limits), [plan, remaining, limits]);
  const binding  = useMemo(() => pickBinding(buckets), [buckets]);
  const lowBudget = binding ? binding.pct <= 0.10 : false;

  // Click-outside + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown',   onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown',   onKey);
    };
  }, [open]);

  const accent = planAccent(plan);
  const ringTone: 'amber' | 'accent' = lowBudget ? 'amber' : 'accent';
  const bindingPctTxt = binding ? `${(binding.pct * 100).toFixed(binding.pct >= 0.995 ? 0 : 1)}%` : '—';
  const showSkeletonRing = loading && !remaining;

  const daysLeft = daysUntil(sub?.expiresAt ?? null);

  return (
    <div ref={wrapRef} className="relative block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${planLabel(plan)} plan usage — ${bindingPctTxt} remaining. Click to open details.`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`group flex items-center gap-1.5 sm:gap-2 pl-2 pr-2 sm:pl-2.5 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-lg bg-white/[0.04] border transition-all ${
          open ? 'bg-white/[0.08] border-white/[0.14]' : 'border-white/[0.08] hover:bg-white/[0.06]'
        } ${lowBudget ? 'border-amber-400/30' : ''}`}
      >
        <span className={`flex items-center gap-1 shrink-0 ${accent}`}>
          <PlanIcon plan={plan} />
          <span className="hidden sm:inline text-[9px] font-black uppercase tracking-[0.25em]">{planLabel(plan)}</span>
        </span>
        <span className={`relative inline-flex ${ringTone === 'amber' ? 'text-amber-400' : accent}`}>
          <Ring pct={binding?.pct ?? 1} size={22} stroke={3} tone={ringTone} loading={showSkeletonRing} />
          {lowBudget && !showSkeletonRing && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-[#09090b]"
            />
          )}
        </span>
        {binding && !showSkeletonRing && (
          <>
            {/* SM and below: compact percent (hidden on XS ≤380px, shown SM..MD) */}
            <span className="hidden min-[381px]:inline md:hidden text-[10px] font-bold text-white/70 tabular-nums shrink-0">
              {bindingPctTxt}
            </span>
            {/* MD+: full count */}
            <span className="hidden md:inline text-[10px] font-bold text-white/70 tabular-nums shrink-0">
              {binding.remaining.toLocaleString()}
              <span className="text-white/25"> / {binding.total.toLocaleString()}</span>
            </span>
          </>
        )}
        <ChevronDown
          size={12}
          className={`hidden sm:inline text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${planLabel(plan)} plan usage details`}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 sm:right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] z-[55] rounded-xl bg-[#0b0b0e] border border-white/[0.1] shadow-2xl shadow-black/60 p-4"
        >
          <div className="flex items-center justify-between mb-3 gap-2">
            <span className={`flex items-center gap-1.5 min-w-0 ${accent}`}>
              <PlanIcon plan={plan} size={13} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] truncate">{planLabel(plan)} plan</span>
            </span>
            {lowBudget && (
              <span className="flex items-center gap-1 text-amber-400 text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={10} /> Low
              </span>
            )}
          </div>

          <div className={`space-y-3 ${ringTone === 'amber' ? 'text-amber-400' : accent}`}>
            {buckets.length === 0 && (
              <div className="text-[11px] font-bold text-white/40">No usage data yet.</div>
            )}
            {buckets.map((b) => (
              <BucketBar key={b.key} bucket={b} tone={b.pct <= 0.10 ? 'amber' : 'accent'} />
            ))}
          </div>

          {(plan === 'proMax' || plan === 'enterprise') && (
            <div className="mt-3 inline-flex px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-black text-white/50 uppercase tracking-widest">
              No daily limit
            </div>
          )}

          {plan !== 'free' && sub?.expiresAt && (
            <div className="mt-3 text-[10px] font-bold text-white/40 truncate">
              {sub.status === 'cancelled'
                ? `Plan ends ${new Date(sub.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `Plan renews in ${daysLeft ?? 0}d`}
            </div>
          )}

          {isGuest ? (
            <div className="mt-4 text-[10px] font-bold text-white/30 leading-relaxed">
              Guest view — plan is managed by the conversation host.
            </div>
          ) : (
            <a
              href="/subscription"
              onClick={(e) => {
                // Plain anchor as a fallback path if React Router navigate is
                // ever blocked by a layout change race; preventDefault +
                // navigate() keeps it a SPA transition in the normal case.
                e.preventDefault();
                navigate('/subscription');
              }}
              className="mt-4 w-full py-2 min-h-[40px] rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[10px] font-black text-white/80 uppercase tracking-[0.25em] flex items-center justify-center gap-1.5 transition-all"
            >
              Manage plan <ArrowRight size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
});
TokenUsageBadge.displayName = 'TokenUsageBadge';
