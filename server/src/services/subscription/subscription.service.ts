import mongoose from 'mongoose';
import {
  Subscription,
  type SubscriptionDoc,
  type BillingCycle,
} from '../../models/subscription.model.js';
import { ensureBuckets, getRemaining, type RemainingSummary } from './tokenBucket.service.js';
import { cycleToDurationDays, type PaidPlanKey } from './subscriptionPlans.js';
import { TokenBucket } from '../../models/tokenBucket.model.js';
import { requireTransaction, withSession } from '../../utils/transaction.util.js';

interface SessionOpts {
  session?: mongoose.ClientSession | null | undefined;
}

type UserIdLike = mongoose.Types.ObjectId | string;

const toObjectId = (id: UserIdLike): mongoose.Types.ObjectId =>
  typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get the user's subscription, seeding a free one lazily if it doesn't exist.
 * Also runs any pending expiry flips and ensures the bucket set matches the
 * effective plan. Always returns an active-status sub (free after expiry).
 */
export const getOrCreateForUser = async (
  userId: UserIdLike,
  opts: SessionOpts = {},
): Promise<SubscriptionDoc> => {
  const session = opts.session ?? undefined;
  const uid = toObjectId(userId);
  let sub = await Subscription.findOne({ userId: uid }, null, withSession(session));
  if (!sub) {
    const created = await Subscription.create(
      [{
        userId:   uid,
        plan:     'free',
        status:   'active',
        startsAt: new Date(),
      }],
      withSession(session),
    );
    sub = created[0]!;
  }
  sub = await expireIfNeeded(sub, session);
  await ensureBuckets(uid, sub.plan, { session });
  return sub;
};

/**
 * If a paid sub has passed its expiresAt, flip it back to free.
 */
const expireIfNeeded = async (
  sub: SubscriptionDoc,
  session: mongoose.ClientSession | undefined,
): Promise<SubscriptionDoc> => {
  if (sub.plan === 'free') return sub;
  if (!sub.expiresAt || sub.expiresAt.getTime() > Date.now()) return sub;

  sub.plan = 'free';
  sub.set('billingCycle', undefined);
  sub.status = 'active';
  sub.set('expiresAt', undefined);
  sub.set('customMonthlyLimit', undefined);
  sub.set('customDurationMonths', undefined);
  sub.startsAt = new Date();
  await sub.save(withSession(session));
  await ensureBuckets(sub.userId as mongoose.Types.ObjectId, 'free', { session });
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

  // Atomicity matters: if we upsert the subscription but fail to reset buckets
  // before the next request lands, the user has the new plan with stale quotas
  // (or vice versa). Pro / Pro Max / Enterprise activation therefore requires
  // a replica-set Mongo deployment. Standalone dev Mongo will fail loudly.
  return requireTransaction(async (rawSession) => {
    const session = rawSession ?? undefined;
    const sub = await Subscription.findOneAndUpdate(
      { userId: uid },
      { ...update, $inc: { purchasesCount: 1 } },
      { upsert: true, new: true, ...withSession(session) },
    );
    if (!sub) throw new Error('Failed to upsert subscription');

    // Reset buckets for the new plan (fresh buckets).
    await TokenBucket.deleteMany({ userId: uid }, withSession(session));
    await ensureBuckets(uid, opts.plan, { session });

    return sub;
  });
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
