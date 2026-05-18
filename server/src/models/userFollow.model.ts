import mongoose, { Schema } from 'mongoose';

export interface IUserFollow {
  followerId:  mongoose.Types.ObjectId;   // user doing the following
  followingId: mongoose.Types.ObjectId;   // user being followed
  createdAt:   Date;
}

export type UserFollowDoc = mongoose.HydratedDocument<IUserFollow>;

const UserFollowSchema = new Schema<IUserFollow>(
  {
    followerId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

UserFollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
UserFollowSchema.index({ followingId: 1, createdAt: -1 });
UserFollowSchema.index({ followerId: 1, createdAt: -1 });

export const UserFollow = mongoose.model<IUserFollow>('UserFollow', UserFollowSchema);
