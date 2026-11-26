import mongoose, { Schema } from 'mongoose';

export const ApplicationStatus = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' } as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

/** A user's request to become a reseller, decided by staff. */
export interface IResellerApplication {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  website?: string;
  note?: string;
  status: ApplicationStatus;
  decidedBy?: mongoose.Types.ObjectId;
  decisionNote?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResellerApplicationSchema = new Schema<IResellerApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    website: { type: String, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: Object.values(ApplicationStatus), default: ApplicationStatus.PENDING },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionNote: { type: String, maxlength: 1000 },
    decidedAt: { type: Date },
  },
  { timestamps: true },
);

// At most one pending application per user.
ResellerApplicationSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
ResellerApplicationSchema.index({ status: 1, createdAt: -1 });

export const ResellerApplication = mongoose.model<IResellerApplication>('ResellerApplication', ResellerApplicationSchema);
