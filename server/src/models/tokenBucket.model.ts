import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export type BucketWindow = 'daily' | 'weekly' | 'monthly';

interface TokenBucketAttrs {
  userId:   mongoose.Types.ObjectId;
  window:   BucketWindow;
  limit:    number;
  used:     number;
  resetAt:  Date;
}

export type TokenBucketDoc = HydratedDocument<TokenBucketAttrs>;

const TokenBucketSchema = new Schema<TokenBucketAttrs>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    window:  { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    limit:   { type: Number, required: true, min: 0 },
    used:    { type: Number, required: true, default: 0, min: 0 },
    resetAt: { type: Date, required: true },
  },
  { timestamps: true },
);

TokenBucketSchema.index({ userId: 1, window: 1 }, { unique: true });

export const TokenBucket = mongoose.model<TokenBucketAttrs>('TokenBucket', TokenBucketSchema);
