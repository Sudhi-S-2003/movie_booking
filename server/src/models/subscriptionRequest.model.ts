import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface SubscriptionRequestAttrs {
  userId: mongoose.Types.ObjectId;
  monthlyLimit: number;
  durationMonths: number;
  priceDisplay: number;
  status: RequestStatus;
  userNote?: string;
  adminNote?: string;
  discountPct?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionRequestDoc = HydratedDocument<SubscriptionRequestAttrs>;

const SubscriptionRequestSchema = new Schema<SubscriptionRequestAttrs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    monthlyLimit: { type: Number, required: true },
    durationMonths: { type: Number, required: true },
    priceDisplay: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    userNote: { type: String },
    adminNote: { type: String },
    discountPct: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

SubscriptionRequestSchema.index({ status: 1, createdAt: -1 });
SubscriptionRequestSchema.index({ userId: 1 });

export const SubscriptionRequest = mongoose.model<SubscriptionRequestAttrs>('SubscriptionRequest', SubscriptionRequestSchema);
