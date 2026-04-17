import mongoose, { Schema, Document } from 'mongoose';

export interface PostLikeDoc extends Document {
  userId:    mongoose.Types.ObjectId;
  postId:    mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostLikeSchema = new Schema<PostLikeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PostLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
PostLikeSchema.index({ postId: 1 });

export const PostLike = mongoose.model<PostLikeDoc>('PostLike', PostLikeSchema);
