import mongoose, { Schema, Document } from 'mongoose';

export interface BookmarkDoc extends Document {
  userId:    mongoose.Types.ObjectId;
  postId:    mongoose.Types.ObjectId;
  createdAt: Date;
}

const BookmarkSchema = new Schema<BookmarkDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export const Bookmark = mongoose.model<BookmarkDoc>('Bookmark', BookmarkSchema);
