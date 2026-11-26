import mongoose, { Schema } from 'mongoose';

/**
 * Append-only audit trail of privileged actions (account management,
 * pricing, wallet and billing operations). Updates and deletes are
 * rejected at the model layer; retention is handled by ops, not the API.
 */
export interface IAuditLog {
  actorId?: mongoose.Types.ObjectId | null;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  /** Owning-reseller path of the target, for scoped audit views. */
  targetAncestors: mongoose.Types.ObjectId[];
  changes?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    targetAncestors: { type: [Schema.Types.ObjectId], default: [] },
    changes: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ targetAncestors: 1, createdAt: -1 });

const immutable = () => {
  throw new Error('Audit log entries are immutable');
};
AuditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'], immutable);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
