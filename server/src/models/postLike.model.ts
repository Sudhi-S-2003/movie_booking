import mongoose, { Schema } from 'mongoose';

export interface IPostLike {
  userId:    mongoose.Types.ObjectId;
  postId:    mongoose.Types.ObjectId;
  createdAt: Date;
}

export type PostLikeDoc = mongoose.HydratedDocument<IPostLike>;

const PostLikeSchema = new Schema<IPostLike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PostLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
PostLikeSchema.index({ postId: 1 });

export const PostLike = mongoose.model<IPostLike>('PostLike', PostLikeSchema);
