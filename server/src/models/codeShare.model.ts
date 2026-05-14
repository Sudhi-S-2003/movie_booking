import mongoose, { Schema, Document } from 'mongoose';

export interface CodeShareDoc extends Document {
  createdBy: mongoose.Types.ObjectId;
  title: string;
  totalLength: number;
  firstChunkId?: mongoose.Types.ObjectId;
  lastChunkId?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CodeShareSchema = new Schema<CodeShareDoc>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    totalLength: { type: Number, default: 0 },
    firstChunkId: { type: Schema.Types.ObjectId, ref: 'CodeShareChunk' },
    lastChunkId: { type: Schema.Types.ObjectId, ref: 'CodeShareChunk' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Index for expiry
CodeShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CodeShare = mongoose.model<CodeShareDoc>('CodeShare', CodeShareSchema);
