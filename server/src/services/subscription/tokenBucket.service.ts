import mongoose from 'mongoose';
import { TokenBucket, type BucketWindow, type TokenBucketDoc } from '../../models/tokenBucket.model.js';
import { FREE_PLAN, PRO_PLAN, PRO_MAX_PLAN, ENTERPRISE_PLAN } from './subscriptionPlans.js';
import { Subscription, type SubscriptionPlan } from '../../models/subscription.model.js';

type UserIdLike = mongoose.Types.ObjectId | string;

const toObjectId = (id: UserIdLike): mongoose.Types.ObjectId =>
  typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;

/**
 * A bucket's reset strategy.
 *
 * - `calendar` → resets on the wall-clock boundary (UTC midnight / Sunday /
 *   1st of month). Used by the Free plan so its captions
 *   ("Rolls over at 12:00 AM", "Rolls over Sunday", "Rolls over on the 1st")
 *   are truthful — everyone's free quota refills at the same global time.
 *
 * - `sliding` → resets `windowMs` after creation / last rollover. Used for
 *   paid plans' monthly bucket so it aligns with the billing anniversary
 *   the user actually paid on, not an arbitrary month boundary.
 */
type ResetStrategy = 'calendar' | 'sliding';

interface WindowSpec {
  window:   BucketWindow;
  limit:    number;
  windowMs: number;
  strategy: ResetStrategy;
}

const freeSpecs = (): WindowSpec[] => [
  { window: 'daily',   limit: FREE_PLAN.buckets.daily.limit,   windowMs: FREE_PLAN.buckets.daily.windowMs,   strategy: 'calendar' },
  { window: 'weekly',  limit: FREE_PLAN.buckets.weekly.limit,  windowMs: FREE_PLAN.buckets.weekly.windowMs,  strategy: 'calendar' },
  // Monthly is a 30-day rolling quota — not a calendar month — so users who
  // join mid-month don't get an early reset windfall. Resets exactly 30 days
  // after the bucket was created or last rolled over.
  { window: 'monthly', limit: FREE_PLAN.buckets.monthly.limit, windowMs: FREE_PLAN.buckets.monthly.windowMs, strategy: 'sliding' },
];

const proSpecs = (): WindowSpec[] => [
  // Daily still aligns to midnight — shared cadence with Free so captions match.
  { window: 'daily',   limit: PRO_PLAN.buckets.daily.limit,   windowMs: PRO_PLAN.buckets.daily.windowMs,   strategy: 'calendar' },
  { window: 'monthly', limit: PRO_PLAN.buckets.monthly.limit, windowMs: PRO_PLAN.buckets.monthly.windowMs, strategy: 'sliding' },
];

const proMaxSpecs = (): WindowSpec[] => [
  { window: 'monthly', limit: PRO_MAX_PLAN.buckets.monthly.limit, windowMs: PRO_MAX_PLAN.buckets.monthly.windowMs, strategy: 'sliding' },
];

const enterpriseSpecs = (customMonthlyLimit: number): WindowSpec[] => [
  { window: 'monthly', limit: customMonthlyLimit, windowMs: ENTERPRISE_PLAN.monthlyWindowMs, strategy: 'sliding' },
];

/**
 * Next wall-clock boundary (UTC) for a calendar-aligned bucket:
 *   • daily   → next 00:00 UTC
 *   • weekly  → next Sunday 00:00 UTC
 *   • monthly → next 1st-of-month 00:00 UTC
 */
const nextCalendarBoundary = (window: BucketWindow, now: Date): Date => {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  if (window === 'daily') {
    return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  }
  if (window === 'weekly') {
    // JS: Sunday = 0. Jump to the NEXT Sunday (7 days if today is Sunday).
    const dow = now.getUTCDay();
    const daysUntilSunday = dow === 0 ? 7 : 7 - dow;
    return new Date(Date.UTC(y, m, d + daysUntilSunday, 0, 0, 0, 0));
  }
  // monthly
  return new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
};

const computeResetAt = (spec: WindowSpec, now: Date): Date =>
  spec.strategy === 'calendar'
    ? nextCalendarBoundary(spec.window, now)
    : new Date(now.getTime() + spec.windowMs);

const specsFor = async (
  userId: mongoose.Types.ObjectId,
  plan: SubscriptionPlan,
): Promise<WindowSpec[]> => {
  if (plan === 'pro')    return proSpecs();
  if (plan === 'proMax') return proMaxSpecs();
  if (plan === 'enterprise') {
    // Look up custom limit from the sub doc.
    const sub = await Subscription.findOne({ userId }).lean();
    const limit = sub?.customMonthlyLimit ?? 0;
    return enterpriseSpecs(limit);
  }
  return freeSpecs();
};

const rollOverIfDue = async (bucket: TokenBucketDoc, spec: WindowSpec): Promise<TokenBucketDoc> => {
  const now = new Date();
  if (bucket.resetAt.getTime() <= now.getTime()) {
    bucket.used = 0;
    bucket.resetAt = computeResetAt(spec, now);
    bucket.limit = spec.limit;
    await bucket.save();
  } else if (bucket.limit !== spec.limit) {
    // Plan change (e.g. upgrade/downgrade) — resync the stored limit.
    bucket.limit = spec.limit;
    await bucket.save();
  }
  return bucket;
};

/**
 * Ensure the caller has exactly the bucket set their current plan demands.
 * Creates missing buckets, deletes ones that no longer apply. Also rolls over
 * any expired buckets.
 */
export const ensureBuckets = async (
  userId: UserIdLike,
  plan: SubscriptionPlan,
): Promise<TokenBucketDoc[]> => {
  const uid = toObjectId(userId);
  const specs = await specsFor(uid, plan);
  const wantedWindows = new Set(specs.map((s) => s.window));

  // Delete buckets that no longer match the plan's window set.
  await TokenBucket.deleteMany({
    userId: uid,
    window: { $nin: Array.from(wantedWindows) },
  });

  const now = new Date();
  const buckets: TokenBucketDoc[] = [];
  for (const spec of specs) {
    const existing = await TokenBucket.findOne({ userId: uid, window: spec.window });
    const bucket = existing
      ? await rollOverIfDue(existing as unknown as TokenBucketDoc, spec)
      : (await TokenBucket.create({
          userId:  uid,
          window:  spec.window,
          limit:   spec.limit,
          used:    0,
          resetAt: computeResetAt(spec, now),
        })) as unknown as TokenBucketDoc;
    buckets.push(bucket);
  }
  return buckets;
};

export interface RemainingSummary {
  plan:    SubscriptionPlan;
  daily?:   number;
  weekly?:  number;
  monthly?: number;
  /**
   * Per-bucket `resetAt` in ISO 8601 UTC — lets the client render the exact
   * next-rollover moment without guessing.
   */
  resetAt?: {
    daily?:   string;
    weekly?:  string;
    monthly?: string;
  };
}

export const getRemaining = async (
  userId: UserIdLike,
  plan: SubscriptionPlan,
): Promise<RemainingSummary> => {
  const buckets = await ensureBuckets(userId, plan);
  const summary: RemainingSummary = { plan };
  const resetAt: RemainingSummary['resetAt'] = {};
  for (const b of buckets) {
    const remaining = Math.max(0, b.limit - b.used);
    summary[b.window] = remaining;
    resetAt[b.window] = b.resetAt.toISOString();
  }
  if (Object.keys(resetAt).length > 0) summary.resetAt = resetAt;
  return summary;
};

interface DebitResult {
  ok:        boolean;
  remaining: RemainingSummary;
  blockedBy?: BucketWindow;
}

/**
 * Atomically debit `cost` from every bucket the user owns. Each bucket update
 * is a single `findOneAndUpdate` guarded by `used <= limit - cost` so we can't
 * overflow. If any bucket fails we best-effort refund the ones we already
 * debited and return a `blockedBy` hint.
 */
export const debit = async (
  userId: UserIdLike,
  cost: number,
  plan: SubscriptionPlan,
): Promise<DebitResult> => {
  const uid = toObjectId(userId);
  if (!Number.isFinite(cost) || cost <= 0) {
    const remaining = await getRemaining(uid, plan);
    return { ok: true, remaining };
  }

  const buckets = await ensureBuckets(uid, plan);
  const debited: { _id: mongoose.Types.ObjectId; window: BucketWindow; cost: number }[] = [];

  for (const bucket of buckets) {
    const updated = await TokenBucket.findOneAndUpdate(
      {
        _id:  bucket._id,
        used: { $lte: bucket.limit - cost },
      },
      { $inc: { used: cost } },
      { returnDocument: 'after' },
    );
    if (!updated) {
      // Roll back previously-debited buckets (best-effort refund).
      for (const d of debited) {
        await TokenBucket.updateOne({ _id: d._id }, { $inc: { used: -d.cost } });
      }
      const remaining = await getRemaining(uid, plan);
      return { ok: false, remaining, blockedBy: bucket.window };
    }
    debited.push({
      _id: bucket._id as mongoose.Types.ObjectId,
      window: bucket.window,
      cost,
    });
  }

  const remaining = await getRemaining(uid, plan);
  return { ok: true, remaining };
};
