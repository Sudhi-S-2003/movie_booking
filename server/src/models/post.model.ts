import mongoose, { Schema, Document } from 'mongoose';

export interface PostDoc extends Document {
  authorId:     mongoose.Types.ObjectId;
  title:        string;
  content:      string;
  excerpt?:     string;
  imageUrl?:    string;
  hashtags:     string[];      // lowercase slugs
  likeCount:    number;
  commentCount: number;
  viewCount:    number;
  pinned:       boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const PostSchema = new Schema<PostDoc>(
  {
    authorId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title:        { type: String, required: true, trim: true },
    content:      { type: String, required: true },
    excerpt:      { type: String },
    imageUrl:     { type: String },
    hashtags:     [{ type: String, lowercase: true, trim: true, index: true }],
    likeCount:    { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    viewCount:    { type: Number, default: 0 },
    pinned:       { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Feed queries: "posts for hashtag X, newest first"
PostSchema.index({ hashtags: 1, createdAt: -1 });
// Top queries: "most liked for hashtag X"
PostSchema.index({ hashtags: 1, likeCount: -1 });
// Full-text
PostSchema.index({ title: 'text', content: 'text' });

export const Post = mongoose.model<PostDoc>('Post', PostSchema);
