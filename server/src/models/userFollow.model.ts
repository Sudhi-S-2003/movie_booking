import mongoose, { Schema, Document } from 'mongoose';

export interface UserFollowDoc extends Document {
  followerId:  mongoose.Types.ObjectId;   // user doing the following
  followingId: mongoose.Types.ObjectId;   // user being followed
  createdAt:   Date;
}

const UserFollowSchema = new Schema<UserFollowDoc>(
  {
    followerId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
UserFollowSchema.index({ followingId: 1, createdAt: -1 });
UserFollowSchema.index({ followerId: 1, createdAt: -1 });

export const UserFollow = mongoose.model<UserFollowDoc>('UserFollow', UserFollowSchema);
