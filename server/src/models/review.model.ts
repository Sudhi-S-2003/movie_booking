import mongoose, { Schema } from 'mongoose';
import type { IReview } from '../interfaces/models.interface.js';

const ReviewSchema = new Schema<IReview>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true, refPath: 'targetType' },
    targetType: { type: String, enum: ['Movie', 'Theatre'], required: true },
    rating:     { type: Number, min: 1, max: 10, required: true },
    comment:    { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

// One review per user per target.
ReviewSchema.index({ userId: 1, targetId: 1 }, { unique: true });
// List queries: newest reviews for a given movie/theatre
ReviewSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
// Profile queries: all reviews by a user
ReviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
