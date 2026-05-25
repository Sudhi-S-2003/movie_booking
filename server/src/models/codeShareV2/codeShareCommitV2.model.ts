import mongoose, { Schema } from 'mongoose';

export interface ICommitChange {
  path: string;
  type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder' | 'rename';
  oldPath?: string;
  additions: number;
  deletions: number;
}

export interface ICodeShareCommitV2 {
  codeShareId: mongoose.Types.ObjectId;
  parentCommitId?: mongoose.Types.ObjectId;
  message: string;
  createdBy: string;
  changes: ICommitChange[];
  expiresAt?: Date;
  createdAt: Date;
}

export type CodeShareCommitV2Doc = mongoose.HydratedDocument<ICodeShareCommitV2>;

const CommitChangeSchema = new Schema<ICommitChange>({
  path: { type: String, required: true },
  type: { type: String, enum: ['add', 'modify', 'delete', 'create-folder', 'delete-folder', 'rename'], required: true },
  oldPath: { type: String },
  additions: { type: Number, default: 0 },
  deletions: { type: Number, default: 0 },
}, { _id: false });

const CodeShareCommitV2Schema = new Schema<ICodeShareCommitV2>(
  {
    codeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShareV2', required: true },
    parentCommitId: { type: Schema.Types.ObjectId, ref: 'CodeShareCommitV2' },
    message: { type: String, required: true, trim: true, maxlength: 200 },
    createdBy: { type: String, required: true },
    changes: [CommitChangeSchema],
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Indexes
CodeShareCommitV2Schema.index({ codeShareId: 1, createdAt: -1 });
CodeShareCommitV2Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CodeShareCommitV2 = mongoose.model<ICodeShareCommitV2>('CodeShareCommitV2', CodeShareCommitV2Schema);
