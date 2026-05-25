import mongoose, { Schema } from 'mongoose';

export interface ICodeShareCommitChangeV2 {
  codeShareId: mongoose.Types.ObjectId;
  commitId: mongoose.Types.ObjectId;
  path: string;
  type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder' | 'rename';
  content?: string;
  additions: number;
  deletions: number;
  diff?: string; // Stored as a JSON string of DiffLine[]
  expiresAt?: Date;
}

export type CodeShareCommitChangeV2Doc = mongoose.HydratedDocument<ICodeShareCommitChangeV2>;

const CodeShareCommitChangeV2Schema = new Schema<ICodeShareCommitChangeV2>(
  {
    codeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShareV2', required: true },
    commitId: { type: Schema.Types.ObjectId, ref: 'CodeShareCommitV2', required: true },
    path: { type: String, required: true },
    type: { type: String, enum: ['add', 'modify', 'delete', 'create-folder', 'delete-folder', 'rename'], required: true },
    content: { type: String },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    diff: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Indexes for fast lookups
CodeShareCommitChangeV2Schema.index({ commitId: 1 });
CodeShareCommitChangeV2Schema.index({ codeShareId: 1 });
CodeShareCommitChangeV2Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CodeShareCommitChangeV2 = mongoose.model<ICodeShareCommitChangeV2>(
  'CodeShareCommitChangeV2',
  CodeShareCommitChangeV2Schema
);
