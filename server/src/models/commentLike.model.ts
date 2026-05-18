import mongoose, { Schema } from 'mongoose';

export interface ICommentLike {
  userId:    mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export type CommentLikeDoc = mongoose.HydratedDocument<ICommentLike>;

const CommentLikeSchema = new Schema<ICommentLike>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
CommentLikeSchema.index({ commentId: 1 });

export const CommentLike = mongoose.model<ICommentLike>('CommentLike', CommentLikeSchema);
