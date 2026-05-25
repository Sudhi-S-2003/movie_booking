import mongoose, { Schema } from 'mongoose';

export interface ICodeShareV2 {
  createdBy: mongoose.Types.ObjectId;
  title: string;
  headCommitId?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CodeShareV2Doc = mongoose.HydratedDocument<ICodeShareV2>;

const CodeShareV2Schema = new Schema<ICodeShareV2>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    headCommitId: { type: Schema.Types.ObjectId, ref: 'CodeShareCommitV2' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Index for TTL expiration
CodeShareV2Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CodeShareV2 = mongoose.model<ICodeShareV2>('CodeShareV2', CodeShareV2Schema);
