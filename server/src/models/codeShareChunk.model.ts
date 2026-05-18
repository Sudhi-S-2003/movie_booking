import mongoose, { Schema } from 'mongoose';

export interface ICodeShareChunk {
  codeShareId?: mongoose.Types.ObjectId;
  prevChunkId?: mongoose.Types.ObjectId; // null for the first chunk
  nextChunkId?: mongoose.Types.ObjectId; // null for the last chunk
  content: string;
  createdAt: Date;
}

export type CodeShareChunkDoc = mongoose.HydratedDocument<ICodeShareChunk>;

const CodeShareChunkSchema = new Schema<ICodeShareChunk>(
  {
    codeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShare' },
    prevChunkId: { type: Schema.Types.ObjectId, ref: 'CodeShareChunk' },
    nextChunkId: { type: Schema.Types.ObjectId, ref: 'CodeShareChunk' },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Fast lookup for sequence navigation
CodeShareChunkSchema.index({ codeShareId: 1, prevChunkId: 1 });
CodeShareChunkSchema.index({ codeShareId: 1, nextChunkId: 1 });

export const CodeShareChunk = mongoose.model<ICodeShareChunk>('CodeShareChunk', CodeShareChunkSchema);
