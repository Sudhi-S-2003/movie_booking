import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export type SubscriptionPlan = 'free' | 'pro' | 'proMax' | 'enterprise';
export type BillingCycle = 'monthly' | 'quarterly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface SubscriptionAttrs {
  userId:        mongoose.Types.ObjectId;
  plan:          SubscriptionPlan;
  billingCycle?: BillingCycle | undefined;
  startsAt:      Date;
  expiresAt?:    Date | undefined;
  status:        SubscriptionStatus;
  lastPaymentId?: string | undefined;
  customMonthlyLimit?:    number | undefined;
  customDurationMonths?:  number | undefined;
  /**
   * How many paid subscriptions this user has purchased (across all time).
   * Drives the first-time / second-time promotional discount tiers:
   *   0 purchases → 60% off
   *   1 purchase  → 50% off
   *   ≥ 2         → no promo discount
   */
  purchasesCount: number;
  createdAt:     Date;
  updatedAt:     Date;
}

export type SubscriptionDoc = HydratedDocument<SubscriptionAttrs>;

const SubscriptionSchema = new Schema<SubscriptionAttrs>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan:          { type: String, enum: ['free', 'pro', 'proMax', 'enterprise'], required: true, default: 'free' },
    billingCycle:  { type: String, enum: ['monthly', 'quarterly'] },
    startsAt:      { type: Date, default: Date.now, required: true },
    expiresAt:     { type: Date },
    status:        { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', required: true },
    lastPaymentId: { type: String },
    purchasesCount: { type: Number, default: 0, required: true, min: 0 },
    customMonthlyLimit:   { type: Number, min: 0 },
    customDurationMonths: {
      type: Number,
      min: 1,
      max: 12,
      validate: {
        validator: (v: number | undefined) =>
          v === undefined || (Number.isInteger(v) && v >= 1 && v <= 12),
        message: 'customDurationMonths must be an integer between 1 and 12',
      },
    },
  },
  { timestamps: true },
);

SubscriptionSchema.index({ userId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1, expiresAt: 1 });

export const Subscription = mongoose.model<SubscriptionAttrs>('Subscription', SubscriptionSchema);
