import mongoose, { Schema } from 'mongoose';

export interface IRateLimit {
  key:       string;
  count:     number;
  expiresAt: Date;
}

export type RateLimitDoc = mongoose.HydratedDocument<IRateLimit>;

const RateLimitSchema = new Schema<IRateLimit>(
  {
    key: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    count: {
      type:     Number,
      required: true,
      default:  1,
    },
    expiresAt: {
      type:     Date,
      required: true,
    },
  },
  { timestamps: true },
);

// TTL Index: instruct MongoDB to automatically drop expired documents
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
