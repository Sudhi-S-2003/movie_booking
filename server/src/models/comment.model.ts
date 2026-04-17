import mongoose, { Schema, Document } from 'mongoose';

export interface CommentDoc extends Document {
  postId:    mongoose.Types.ObjectId;
  userId:    mongoose.Types.ObjectId;
  text:      string;
  /** Parent comment for one-level-deep replies; null = top-level. */
  parentId?: mongoose.Types.ObjectId;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<CommentDoc>(
  {
    postId:    { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:      { type: String, required: true, maxlength: 1000 },
    parentId:  { type: Schema.Types.ObjectId, ref: 'Comment' },
    likeCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// List query: comments for post X, newest first
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, createdAt: 1 });

export const Comment = mongoose.model<CommentDoc>('Comment', CommentSchema);
