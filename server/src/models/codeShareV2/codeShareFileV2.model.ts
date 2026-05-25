import mongoose, { Schema } from 'mongoose';

export interface ICodeShareFileV2 {
  codeShareId: mongoose.Types.ObjectId;
  path: string;
  content: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CodeShareFileV2Doc = mongoose.HydratedDocument<ICodeShareFileV2>;

const CodeShareFileV2Schema = new Schema<ICodeShareFileV2>(
  {
    codeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShareV2', required: true },
    path: { type: String, required: true },
    content: { type: String, default: '' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for fast lookup of a unique path in a project
CodeShareFileV2Schema.index({ codeShareId: 1, path: 1 }, { unique: true });
CodeShareFileV2Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CodeShareFileV2 = mongoose.model<ICodeShareFileV2>('CodeShareFileV2', CodeShareFileV2Schema);
