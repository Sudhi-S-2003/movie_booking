import type { Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuthUser } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import {
  getSummary,
  cancelAtPeriodEnd,
} from '../services/subscription/subscription.service.js';
import {
  PLAN_CATALOG,
  cycleToPriceInPaise,
  computeEnterprisePricing,
  applyPromoDiscount,
  promoDiscountFor,
  ENTERPRISE_PLAN,
  type PaidPlanKey,
} from '../services/subscription/subscriptionPlans.js';
import { getOrCreateForUser } from '../services/subscription/subscription.service.js';
import { paymentIntentsStore } from './payment.controller.js';
import type { BillingCycle } from '../models/subscription.model.js';

const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(16).toString('hex')}`;

const toPayload = (summary: Awaited<ReturnType<typeof getSummary>>) => {
  const { sub, remaining } = summary;
  const purchases = sub.purchasesCount ?? 0;
  return {
    subscription: {
      plan:         sub.plan,
      billingCycle: sub.billingCycle ?? null,
      status:       sub.status,
      startsAt:     sub.startsAt,
      expiresAt:    sub.expiresAt ?? null,
      customMonthlyLimit:   sub.customMonthlyLimit   ?? null,
      customDurationMonths: sub.customDurationMonths ?? null,
      purchasesCount: purchases,
    },
    remaining,
    // The promo tier the user is currently eligible for. Clients use this
    // to apply the discount preview on plan cards without round-tripping to
    // each checkout endpoint.
    promo: {
      purchasesCount: purchases,
      discountPct:    promoDiscountFor(purchases),
    },
  };
};

/** GET /api/subscription — current sub + remaining tokens. */
export const getMySubscription = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const summary = await getSummary(String(user._id));
    res.json({ success: true, ...toPayload(summary) });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/subscription/plans — plan catalog, plus the viewer's applicable
 * promo tier and per-cycle offer details.
 *
 * Public fallback: when called without a JWT we still return the base
 * catalog (priceDisplay / priceInPaise), but with `promo.offerType = 'none'`
 * so the UI doesn't promise a discount that can't be enforced.
 *
 * Authenticated: includes the user's current tier
 *   offerType: 'firstOrder'  → 60% off (purchasesCount = 0)
 *              'secondOrder' → 50% off (purchasesCount = 1)
 *              'none'        → no discount
 * and per-paid-cycle `finalPriceInPaise` / `finalPriceDisplay` so each plan
 * card can render a strike-through + final number without extra round-trips.
 */
export const getPlans = async (req: Request, res: Response) => {
  const user = req.user ?? null;

  // Determine the user's current tier. No user → everyone is "none".
  let purchasesCount = -1; // sentinel: anonymous
  if (user) {
    const sub = await getOrCreateForUser(String(user._id));
    purchasesCount = sub.purchasesCount ?? 0;
  }
  const discountPct = purchasesCount < 0 ? 0 : promoDiscountFor(purchasesCount);
  const offerType: 'firstOrder' | 'secondOrder' | 'none' =
    purchasesCount === 0 ? 'firstOrder' :
    purchasesCount === 1 ? 'secondOrder' :
    'none';

  // Build per-plan offer blob. Only the four paid cards get a final-price
  // computation; free and enterprise are special-cased.
  const priceAfter = (paise: number): { finalPriceInPaise: number; finalPriceDisplay: number } => {
    const final = Math.round(paise * (100 - discountPct) / 100);
    return { finalPriceInPaise: final, finalPriceDisplay: Math.round(final / 100) };
  };

  /**
   * Decorate a paid plan with every number the UI needs to render — NO client
   * math beyond picking a cycle:
   *
   *   • `offer`               — the promo tier we computed above
   *   • `displayPrice`        — final rupees for the whole cycle
   *   • `displayPriceInPaise` — same in paise
   *   • `perMonthDisplay`     — final rupees normalised to a month (for
   *                             quarterly, displayPrice / 3). Ready to
   *                             render as "≈ ₹X/mo" without math.
   *   • `perMonthInPaise`
   *   • `saveDisplay`         — how many rupees the user saves vs the
   *                             pre-promo base for this cycle. 0 when no
   *                             promo applies.
   *   • `saveInPaise`
   */
  const withPaidOffer = <T extends { priceInPaise: number; priceDisplay: number; durationDays: number }>(plan: T) => {
    const offer = { offerType, discountPct, ...priceAfter(plan.priceInPaise) };
    const months = Math.max(1, Math.round(plan.durationDays / 30));
    const perMonthInPaise = Math.round(offer.finalPriceInPaise / months);
    const saveInPaise = Math.max(0, plan.priceInPaise - offer.finalPriceInPaise);
    return {
      ...plan,
      offer,
      displayPrice:        offer.finalPriceDisplay,
      displayPriceInPaise: offer.finalPriceInPaise,
      perMonthInPaise,
      perMonthDisplay:     Math.round(perMonthInPaise / 100),
      saveInPaise,
      saveDisplay:         Math.round(saveInPaise / 100),
    };
  };

  const plansWithOffer = {
    free: {
      ...PLAN_CATALOG.free,
      offer: { offerType: 'none' as const, discountPct: 0 },
      displayPrice:        PLAN_CATALOG.free.priceDisplay,
      displayPriceInPaise: 0,
      perMonthDisplay:     0,
      perMonthInPaise:     0,
      saveDisplay:         0,
      saveInPaise:         0,
    },
    proMonthly:      withPaidOffer(PLAN_CATALOG.proMonthly),
    proQuarterly:    withPaidOffer(PLAN_CATALOG.proQuarterly),
    proMaxMonthly:   withPaidOffer(PLAN_CATALOG.proMaxMonthly),
    proMaxQuarterly: withPaidOffer(PLAN_CATALOG.proMaxQuarterly),
    enterprise: {
      ...PLAN_CATALOG.enterprise,
      // Enterprise price is driven by user inputs at quote time — there is
      // no catalog price to display, so surface 0 and let the UI use the
      // quote endpoint's `finalPriceDisplay` instead.
      offer: { offerType, discountPct },
      displayPrice:        0,
      displayPriceInPaise: 0,
      perMonthDisplay:     0,
      perMonthInPaise:     0,
      saveDisplay:         0,
      saveInPaise:         0,
    },
  };

  res.json({
    success: true,
    plans: plansWithOffer,
    viewer: {
      authenticated: !!user,
      purchasesCount: purchasesCount < 0 ? null : purchasesCount,
      offerType,
      discountPct,
    },
  });
};

/**
 * POST /api/subscription/checkout
 * Body: { plan: 'pro' | 'proMax', cycle: 'monthly' | 'quarterly' }
 * Creates an in-memory payment intent tagged as `kind: 'subscription'`.
 */
export const checkout = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const plan = (req.body?.plan as PaidPlanKey | undefined) ?? 'pro';
    const cycle = (req.body?.cycle as BillingCycle | undefined) ?? 'monthly';
    if (plan !== 'pro' && plan !== 'proMax') {
      return res.status(400).json({ success: false, message: 'plan must be pro or proMax' });
    }
    if (cycle !== 'monthly' && cycle !== 'quarterly') {
      return res.status(400).json({ success: false, message: 'cycle must be monthly or quarterly' });
    }

    const basePrice = cycleToPriceInPaise(plan, cycle);

    // Apply the user's first-time / second-time promo tier on top of the
    // cycle price. Lock the promoPct into the intent metadata so the final
    // charge matches whatever we quoted, even if the user's purchase count
    // changes between checkout + confirm.
    const existingSub  = await getOrCreateForUser(String(user._id));
    const purchases    = existingSub.purchasesCount ?? 0;
    const promo        = applyPromoDiscount(basePrice, purchases);
    const amount       = promo.discounted;
    const currency     = 'INR';

    const paymentIntentId = generateId('pi');
    const clientSecret    = generateId('secret');

    paymentIntentsStore.set(paymentIntentId, {
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status:   'requires_payment',
      kind:     'subscription',
      userId:   String(user._id),
      createdAt: new Date(),
      metadata: {
        plan, cycle,
        promoPct:       promo.discountPct,
        originalPrice:  promo.original,
      },
    });

    res.status(201).json({
      success: true,
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status: 'requires_payment',
      plan,
      cycle,
      promoPct:      promo.discountPct,
      originalPrice: promo.original,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * GET /api/subscription/enterprise/quote?monthlyLimit=...&durationMonths=...
 * Public pricing preview — no auth needed; the price is deterministic and
 * matches what `enterpriseCheckout` will charge. Lets the UI show a live
 * total as the user types.
 */
export const enterpriseQuote = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const monthlyLimit   = Number(req.query.monthlyLimit);
    const durationMonths = Number(req.query.durationMonths);

    const limitOk    = Number.isFinite(monthlyLimit)   && monthlyLimit   >= ENTERPRISE_PLAN.minMonthlyLimit;
    const durationOk = Number.isInteger(durationMonths)
      && durationMonths >= ENTERPRISE_PLAN.minDurationMonths
      && durationMonths <= ENTERPRISE_PLAN.maxDurationMonths;

    if (!limitOk || !durationOk) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monthlyLimit or durationMonths',
        constraints: {
          minMonthlyLimit:   ENTERPRISE_PLAN.minMonthlyLimit,
          minDurationMonths: ENTERPRISE_PLAN.minDurationMonths,
          maxDurationMonths: ENTERPRISE_PLAN.maxDurationMonths,
        },
      });
    }

    const pricing    = computeEnterprisePricing(monthlyLimit, durationMonths);
    const existing   = await getOrCreateForUser(String(user._id));
    const promo      = applyPromoDiscount(pricing.priceInPaise, existing.purchasesCount ?? 0);

    res.json({
      success: true,
      monthlyLimit,
      durationMonths,
      // Base pricing (pre-promo) — keeps the duration-discount pct the UI renders.
      priceInPaise:        pricing.priceInPaise,
      priceDisplay:        pricing.priceDisplay,
      discountPct:         pricing.discountPct,
      // Promo layer — applied on top of duration discount.
      promoPct:            promo.discountPct,
      finalPriceInPaise:   promo.discounted,
      finalPriceDisplay:   Math.round(promo.discounted / 100),
      currency: 'INR',
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/subscription/enterprise/checkout
 * Body: { monthlyLimit: number, durationMonths: number }
 *
 * Price is computed server-side from the two inputs via
 * `computeEnterprisePricing` — the client cannot supply its own price.
 */
export const enterpriseCheckout = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const { monthlyLimit, durationMonths } = req.body ?? {};

    if (
      typeof monthlyLimit !== 'number' ||
      !Number.isFinite(monthlyLimit) ||
      monthlyLimit < ENTERPRISE_PLAN.minMonthlyLimit
    ) {
      return res.status(400).json({
        success: false,
        message: `monthlyLimit must be a number >= ${ENTERPRISE_PLAN.minMonthlyLimit}`,
      });
    }
    if (
      typeof durationMonths !== 'number' ||
      !Number.isInteger(durationMonths) ||
      durationMonths < ENTERPRISE_PLAN.minDurationMonths ||
      durationMonths > ENTERPRISE_PLAN.maxDurationMonths
    ) {
      return res.status(400).json({
        success: false,
        message: `durationMonths must be an integer between ${ENTERPRISE_PLAN.minDurationMonths} and ${ENTERPRISE_PLAN.maxDurationMonths}`,
      });
    }

    const pricing    = computeEnterprisePricing(monthlyLimit, durationMonths);
    const existing   = await getOrCreateForUser(String(user._id));
    const promo      = applyPromoDiscount(pricing.priceInPaise, existing.purchasesCount ?? 0);
    const amount     = promo.discounted;
    const currency   = 'INR';

    const paymentIntentId = generateId('pi');
    const clientSecret    = generateId('secret');

    paymentIntentsStore.set(paymentIntentId, {
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status:   'requires_payment',
      kind:     'subscription',
      userId:   String(user._id),
      createdAt: new Date(),
      metadata: {
        plan: 'enterprise',
        customMonthlyLimit:   monthlyLimit,
        customDurationMonths: durationMonths,
        promoPct:       promo.discountPct,
        originalPrice:  promo.original,
      },
    });

    res.status(201).json({
      success: true,
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status: 'requires_payment',
      plan: 'enterprise',
      customMonthlyLimit:   monthlyLimit,
      customDurationMonths: durationMonths,
      priceDisplay:      pricing.priceDisplay,
      discountPct:       pricing.discountPct,
      promoPct:          promo.discountPct,
      finalPriceInPaise: promo.discounted,
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/**
 * POST /api/subscription/confirm
 * Body: { paymentIntentId }
 * Activation happens inside `confirmPayment`; this endpoint just refetches
 * the summary for the caller's convenience.
 */
export const confirm = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const { paymentIntentId } = req.body ?? {};
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required' });
    }

    const intent = paymentIntentsStore.get(String(paymentIntentId));
    if (!intent) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }
    if (intent.userId !== String(user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (intent.status !== 'succeeded') {
      return res.status(409).json({ success: false, message: 'Payment has not succeeded yet' });
    }

    const summary = await getSummary(String(user._id));
    res.json({ success: true, ...toPayload(summary) });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};

/** POST /api/subscription/cancel — flag paid sub to end at period boundary. */
export const cancel = async (req: Request, res: Response) => {
  try {
    const user = requireAuthUser(req);
    const updated = await cancelAtPeriodEnd(String(user._id));
    if (!updated) {
      return res.status(400).json({ success: false, message: 'No active paid subscription to cancel' });
    }
    const summary = await getSummary(String(user._id));
    res.json({ success: true, ...toPayload(summary) });
  } catch (e: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};
