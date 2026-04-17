import mongoose, { Schema, Document } from 'mongoose';

export interface CommentLikeDoc extends Document {
  userId:    mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CommentLikeSchema = new Schema<CommentLikeDoc>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
CommentLikeSchema.index({ commentId: 1 });

export const CommentLike = mongoose.model<CommentLikeDoc>('CommentLike', CommentLikeSchema);
