import mongoose, { Schema, Document } from 'mongoose';

export interface HashtagFollowDoc extends Document {
  userId:      mongoose.Types.ObjectId;
  hashtagId:   mongoose.Types.ObjectId;
  hashtagSlug: string;
  createdAt:   Date;
}

const HashtagFollowSchema = new Schema<HashtagFollowDoc>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    hashtagId:   { type: Schema.Types.ObjectId, ref: 'Hashtag', required: true },
    hashtagSlug: { type: String, required: true, lowercase: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

HashtagFollowSchema.index({ userId: 1, hashtagId: 1 }, { unique: true });
HashtagFollowSchema.index({ hashtagId: 1 });
HashtagFollowSchema.index({ userId: 1, createdAt: -1 });

export const HashtagFollow = mongoose.model<HashtagFollowDoc>('HashtagFollow', HashtagFollowSchema);
