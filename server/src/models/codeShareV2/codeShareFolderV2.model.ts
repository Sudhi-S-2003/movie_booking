import mongoose, { Schema } from 'mongoose';

export interface ICodeShareFolderV2 {
  codeShareId: mongoose.Types.ObjectId;
  path: string; // e.g. "src", "src/components"
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CodeShareFolderV2Doc = mongoose.HydratedDocument<ICodeShareFolderV2>;

const CodeShareFolderV2Schema = new Schema<ICodeShareFolderV2>(
  {
    codeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShareV2', required: true },
    path: { type: String, required: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for unique folder paths within a project
CodeShareFolderV2Schema.index({ codeShareId: 1, path: 1 }, { unique: true });
CodeShareFolderV2Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CodeShareFolderV2 = mongoose.model<ICodeShareFolderV2>('CodeShareFolderV2', CodeShareFolderV2Schema);
