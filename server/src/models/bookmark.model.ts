import mongoose, { Schema } from 'mongoose';

export interface IBookmark {
  userId:    mongoose.Types.ObjectId;
  postId:    mongoose.Types.ObjectId;
  createdAt: Date;
}

export type BookmarkDoc = mongoose.HydratedDocument<IBookmark>;

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export const Bookmark = mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
