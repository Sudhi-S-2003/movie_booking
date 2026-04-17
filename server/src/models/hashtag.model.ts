import mongoose, { Schema, Document } from 'mongoose';

export interface HashtagDoc extends Document {
  name:          string;
  slug:          string;
  description?:  string;
  color?:        string;
  coverImageUrl?: string;
  postCount:     number;
  followerCount: number;
  viewCount:     number;
  trendingScore: number;
  lastActiveAt:  Date;
  createdAt:     Date;
  updatedAt:     Date;
}

const HashtagSchema = new Schema<HashtagDoc>(
  {
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    description:   { type: String, default: '' },
    color:         { type: String, default: '#6366f1' },
    coverImageUrl: { type: String },
    postCount:     { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    viewCount:     { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    lastActiveAt:  { type: Date, default: Date.now },
  },
  { timestamps: true },
);

HashtagSchema.index({ trendingScore: -1 });
HashtagSchema.index({ postCount: -1 });
HashtagSchema.index({ name: 'text', description: 'text' });

export const Hashtag = mongoose.model<HashtagDoc>('Hashtag', HashtagSchema);
