/**
 * Single source of truth for subscription plan configuration.
 *
 * Consumed by both server (limits, pricing) and exposed to the client via
 * `GET /api/subscription/plans`.
 */

export const FREE_PLAN = {
  plan: 'free' as const,
  buckets: {
    daily:   { limit: 1_000,  windowMs: 24 * 60 * 60 * 1000 },
    weekly:  { limit: 5_000,  windowMs: 7 * 24 * 60 * 60 * 1000 },
    monthly: { limit: 30_000, windowMs: 30 * 24 * 60 * 60 * 1000 },
  },
} as const;

export const PRO_PLAN = {
  plan: 'pro' as const,
  buckets: {
    daily:   { limit: 20_000,  windowMs: 24 * 60 * 60 * 1000 },
    monthly: { limit: 500_000, windowMs: 30 * 24 * 60 * 60 * 1000 },
  },
  cycles: {
    monthly:   { priceInPaise: 49_900,  durationDays: 30,  priceDisplay: 499 },
    quarterly: { priceInPaise: 134_900, durationDays: 90,  priceDisplay: 1_349 },
  },
} as const;

export const PRO_MAX_PLAN = {
  plan: 'proMax' as const,
  buckets: {
    monthly: { limit: 2_000_000, windowMs: 30 * 24 * 60 * 60 * 1000 },
  },
  cycles: {
    monthly:   { priceInPaise: 149_900, durationDays: 30, priceDisplay: 1_499 },
    quarterly: { priceInPaise: 404_900, durationDays: 90, priceDisplay: 4_049 },
  },
} as const;

/** Enterprise has only runtime config (customMonthlyLimit, customDurationMonths). */
export const ENTERPRISE_PLAN = {
  plan: 'enterprise' as const,
  monthlyWindowMs: 30 * 24 * 60 * 60 * 1000,
  /** Rupees per token per month before bulk discount. */
  basePricePerTokenMonth: 0.0007,
  /** Volume discount tiers — longer contracts get a better rate. */
  durationDiscounts: [
    { minMonths: 12, pct: 15 },
    { minMonths: 6,  pct: 10 },
    { minMonths: 3,  pct:  5 },
  ],
  minMonthlyLimit:       100_000,
  minDurationMonths:     1,
  maxDurationMonths:     12,
} as const;

/**
 * Compute the enterprise contract price from its two inputs.
 *
 * Formula:
 *   base    = monthlyLimit × ₹0.0007 × durationMonths
 *   discount= first matching tier in `durationDiscounts` (longer = bigger)
 *   total   = round(base × (100 − discount) / 100)
 *
 * Returned in BOTH paise (server-side authoritative) and rupees (for display),
 * alongside the resolved discount percent so the UI can show "(10% off)".
 *
 * This helper is the SINGLE source of enterprise pricing. The HTTP handler
 * recomputes from the inputs — the client's value is never trusted.
 */
export const computeEnterprisePricing = (
  monthlyLimit:   number,
  durationMonths: number,
): { priceInPaise: number; priceDisplay: number; discountPct: number } => {
  const base = monthlyLimit * ENTERPRISE_PLAN.basePricePerTokenMonth * durationMonths;
  const tier = ENTERPRISE_PLAN.durationDiscounts.find((t) => durationMonths >= t.minMonths);
  const discountPct  = tier?.pct ?? 0;
  const priceDisplay = Math.round(base * (100 - discountPct) / 100);
  return {
    priceInPaise: priceDisplay * 100,
    priceDisplay,
    discountPct,
  };
};

export const PLAN_CATALOG = {
  free: {
    plan: 'free' as const,
    name: 'Free',
    description: 'Casual chat usage with daily, weekly, and monthly caps.',
    priceDisplay: 0,
    currency: 'INR',
    features: [
      '1,000 tokens / day',
      '5,000 tokens / week',
      '30,000 tokens / month',
      'Community support',
    ],
    limits: {
      daily:   FREE_PLAN.buckets.daily.limit,
      weekly:  FREE_PLAN.buckets.weekly.limit,
      monthly: FREE_PLAN.buckets.monthly.limit,
    },
  },
  proMonthly: {
    plan: 'pro' as const,
    cycle: 'monthly' as const,
    name: 'Pro — Monthly',
    description: 'Stay on-rhythm with a 20k daily ceiling and 500k monthly.',
    priceDisplay: PRO_PLAN.cycles.monthly.priceDisplay,
    priceInPaise: PRO_PLAN.cycles.monthly.priceInPaise,
    currency: 'INR',
    durationDays: PRO_PLAN.cycles.monthly.durationDays,
    features: [
      '20,000 tokens / day',
      '500,000 tokens / month',
      'Priority delivery',
      'Cancel anytime',
    ],
    limits: {
      daily:   PRO_PLAN.buckets.daily.limit,
      monthly: PRO_PLAN.buckets.monthly.limit,
    },
  },
  proQuarterly: {
    plan: 'pro' as const,
    cycle: 'quarterly' as const,
    name: 'Pro — Quarterly',
    description: '20k daily / 500k monthly for 3 months — 10% off.',
    priceDisplay: PRO_PLAN.cycles.quarterly.priceDisplay,
    priceInPaise: PRO_PLAN.cycles.quarterly.priceInPaise,
    currency: 'INR',
    durationDays: PRO_PLAN.cycles.quarterly.durationDays,
    savings: 10,
    features: [
      '20,000 tokens / day',
      '500,000 tokens / month × 3',
      'Save 10% vs monthly',
      'Priority delivery',
    ],
    limits: {
      daily:   PRO_PLAN.buckets.daily.limit,
      monthly: PRO_PLAN.buckets.monthly.limit,
    },
  },
  proMaxMonthly: {
    plan: 'proMax' as const,
    cycle: 'monthly' as const,
    name: 'Pro Max — Monthly',
    description: 'Burst freely — no daily limit. 2M tokens every month.',
    priceDisplay: PRO_MAX_PLAN.cycles.monthly.priceDisplay,
    priceInPaise: PRO_MAX_PLAN.cycles.monthly.priceInPaise,
    currency: 'INR',
    durationDays: PRO_MAX_PLAN.cycles.monthly.durationDays,
    features: [
      '2,000,000 tokens / month',
      'No daily cap',
      'Priority delivery',
      'Cancel anytime',
    ],
    limits: { monthly: PRO_MAX_PLAN.buckets.monthly.limit },
  },
  proMaxQuarterly: {
    plan: 'proMax' as const,
    cycle: 'quarterly' as const,
    name: 'Pro Max — Quarterly',
    description: '2M monthly tokens for 3 months — 10% off, no daily cap.',
    priceDisplay: PRO_MAX_PLAN.cycles.quarterly.priceDisplay,
    priceInPaise: PRO_MAX_PLAN.cycles.quarterly.priceInPaise,
    currency: 'INR',
    durationDays: PRO_MAX_PLAN.cycles.quarterly.durationDays,
    savings: 10,
    features: [
      '2,000,000 tokens / month × 3',
      'No daily cap',
      'Save 10% vs monthly',
      'Priority delivery',
    ],
    limits: { monthly: PRO_MAX_PLAN.buckets.monthly.limit },
  },
  enterprise: {
    plan: 'enterprise' as const,
    name: 'Enterprise',
    description: 'Custom monthly limit and duration for teams. Contact sales.',
    priceDisplay: 0,
    currency: 'INR',
    features: [
      'Custom monthly token limit',
      'Custom contract duration (1–12 months)',
      'No daily cap',
      'Dedicated support',
    ],
    limits: {},
  },
} as const;

export const SUBSCRIPTION_PLANS = PLAN_CATALOG;

export type PaidPlanKey = 'pro' | 'proMax';

export const cycleToDurationDays = (
  plan: PaidPlanKey,
  cycle: 'monthly' | 'quarterly',
): number =>
  plan === 'proMax'
    ? PRO_MAX_PLAN.cycles[cycle].durationDays
    : PRO_PLAN.cycles[cycle].durationDays;

export const cycleToPriceInPaise = (
  plan: PaidPlanKey,
  cycle: 'monthly' | 'quarterly',
): number =>
  plan === 'proMax'
    ? PRO_MAX_PLAN.cycles[cycle].priceInPaise
    : PRO_PLAN.cycles[cycle].priceInPaise;

// ── First-time customer promo ───────────────────────────────────────────────

/**
 * Promotional discount keyed to a user's lifetime purchase count.
 *
 *   0 previous purchases → 60% off   (introductory)
 *   1 previous purchase  → 50% off   (welcome-back)
 *   ≥ 2                  →  0% off
 *
 * Stacks MULTIPLICATIVELY with any cycle-level discount baked into the base
 * price (e.g. quarterly vs monthly Pro is already 10% cheaper; the first-time
 * promo then applies to that already-discounted base).
 */
export const PROMO_DISCOUNTS = [60, 50, 0] as const;

export const promoDiscountFor = (purchasesCount: number): number => {
  if (purchasesCount <= 0) return PROMO_DISCOUNTS[0];
  if (purchasesCount === 1) return PROMO_DISCOUNTS[1];
  return PROMO_DISCOUNTS[2];
};

/** Apply the promo discount to a paise amount. Result is an integer. */
export const applyPromoDiscount = (paiseAmount: number, purchasesCount: number): {
  original:    number;
  discounted:  number;
  discountPct: number;
} => {
  const pct = promoDiscountFor(purchasesCount);
  const discounted = Math.round(paiseAmount * (100 - pct) / 100);
  return { original: paiseAmount, discounted, discountPct: pct };
};
