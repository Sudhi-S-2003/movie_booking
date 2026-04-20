import mongoose from 'mongoose';
import {
  Subscription,
  type SubscriptionDoc,
  type BillingCycle,
} from '../../models/subscription.model.js';
import { ensureBuckets, getRemaining, type RemainingSummary } from './tokenBucket.service.js';
import { cycleToDurationDays, type PaidPlanKey } from './subscriptionPlans.js';
import { TokenBucket } from '../../models/tokenBucket.model.js';

type UserIdLike = mongoose.Types.ObjectId | string;

const toObjectId = (id: UserIdLike): mongoose.Types.ObjectId =>
  typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get the user's subscription, seeding a free one lazily if it doesn't exist.
 * Also runs any pending expiry flips and ensures the bucket set matches the
 * effective plan. Always returns an active-status sub (free after expiry).
 */
export const getOrCreateForUser = async (userId: UserIdLike): Promise<SubscriptionDoc> => {
  const uid = toObjectId(userId);
  let sub = await Subscription.findOne({ userId: uid });
  if (!sub) {
    sub = await Subscription.create({
      userId:   uid,
      plan:     'free',
      status:   'active',
      startsAt: new Date(),
    });
  }
  sub = await expireIfNeeded(sub);
  await ensureBuckets(uid, sub.plan);
  return sub;
};

/**
 * If a paid sub has passed its expiresAt, flip it back to free.
 */
const expireIfNeeded = async (sub: SubscriptionDoc): Promise<SubscriptionDoc> => {
  if (sub.plan === 'free') return sub;
  if (!sub.expiresAt || sub.expiresAt.getTime() > Date.now()) return sub;

  sub.plan = 'free';
  sub.set('billingCycle', undefined);
  sub.status = 'active';
  sub.set('expiresAt', undefined);
  sub.set('customMonthlyLimit', undefined);
  sub.set('customDurationMonths', undefined);
  sub.startsAt = new Date();
  await sub.save();
  await ensureBuckets(sub.userId as mongoose.Types.ObjectId, 'free');
  return sub;
};

interface ActivatePaidPlanOptions {
  plan:       PaidPlanKey | 'enterprise';
  cycle?:     BillingCycle;
  paymentId:  string;
  customMonthlyLimit?:   number;
  customDurationMonths?: number;
}

/**
 * Activate a paid plan (Pro, Pro Max, or Enterprise) for a user, resetting
 * their bucket set to match. Enterprise requires customMonthlyLimit +
 * customDurationMonths; Pro/ProMax require a billing cycle.
 */
export const activatePaidPlan = async (
  userId: UserIdLike,
  opts: ActivatePaidPlanOptions,
): Promise<SubscriptionDoc> => {
  const uid = toObjectId(userId);
  const now = Date.now();

  let expiresAt: Date;
  const update: Record<string, unknown> = {
    plan:          opts.plan,
    status:        'active',
    startsAt:      new Date(now),
    lastPaymentId: opts.paymentId,
  };

  if (opts.plan === 'enterprise') {
    const months = opts.customDurationMonths;
    const monthlyLimit = opts.customMonthlyLimit;
    if (
      typeof months !== 'number' ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > 12
    ) {
      throw new Error('customDurationMonths must be an integer between 1 and 12');
    }
    if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      throw new Error('customMonthlyLimit must be a positive number');
    }
    expiresAt = new Date(now + months * 30 * DAY_MS);
    update['customMonthlyLimit']   = monthlyLimit;
    update['customDurationMonths'] = months;
    update['$unset'] = { billingCycle: 1 };
  } else {
    const cycle = opts.cycle;
    if (cycle !== 'monthly' && cycle !== 'quarterly') {
      throw new Error('cycle must be monthly or quarterly');
    }
    const durationDays = cycleToDurationDays(opts.plan, cycle);
    expiresAt = new Date(now + durationDays * DAY_MS);
    update['billingCycle'] = cycle;
    update['$unset'] = { customMonthlyLimit: 1, customDurationMonths: 1 };
  }
  update['expiresAt'] = expiresAt;

  const sub = await Subscription.findOneAndUpdate(
    { userId: uid },
    { ...update, $inc: { purchasesCount: 1 } },
    { upsert: true, new: true },
  );
  if (!sub) throw new Error('Failed to upsert subscription');

  // Reset buckets for the new plan (fresh buckets).
  await TokenBucket.deleteMany({ userId: uid });
  await ensureBuckets(uid, opts.plan);

  return sub;
};

export const cancelAtPeriodEnd = async (userId: UserIdLike): Promise<SubscriptionDoc | null> => {
  const uid = toObjectId(userId);
  return Subscription.findOneAndUpdate(
    { userId: uid, plan: { $in: ['pro', 'proMax', 'enterprise'] } },
    { status: 'cancelled' },
    { new: true },
  );
};

interface SubscriptionSummary {
  sub:       SubscriptionDoc;
  remaining: RemainingSummary;
}

export const getSummary = async (userId: UserIdLike): Promise<SubscriptionSummary> => {
  const sub = await getOrCreateForUser(userId);
  const remaining = await getRemaining(userId, sub.plan);
  return { sub, remaining };
};
