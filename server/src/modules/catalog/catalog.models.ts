import mongoose, { Schema } from 'mongoose';

export const ServiceStatus = { ACTIVE: 'active', BETA: 'beta', DISABLED: 'disabled' } as const;
export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];

/** Admin-managed catalog record for a registered service. */
export interface IService {
  key: string;
  name: string;
  description: string;
  category: string;
  status: ServiceStatus;
  selfServe: boolean;
  /** Platform base price, integer micros per unit. */
  basePrice: number;
  unitLabel: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 1000 },
    category: { type: String, required: true },
    status: { type: String, enum: Object.values(ServiceStatus), default: ServiceStatus.ACTIVE },
    selfServe: { type: Boolean, default: true },
    basePrice: { type: Number, required: true, min: 0, validate: Number.isInteger },
    unitLabel: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Service = mongoose.model<IService>('Service', ServiceSchema);

/**
 * Per-account access to a service.
 *  - `allowed`: granted by the account's reseller or staff (for platform-
 *    direct users of self-serve services it is implied without a row).
 *  - `enabled`: the account owner's own on/off switch.
 * Access also requires every reseller above the account to be allowed.
 */
export interface IEntitlement {
  userId: mongoose.Types.ObjectId;
  serviceKey: string;
  allowed: boolean;
  enabled: boolean;
  /** Owner's service configuration (service-specific, size-limited). */
  config: Record<string, unknown>;
  grantedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EntitlementSchema = new Schema<IEntitlement>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceKey: { type: String, required: true },
    allowed: { type: Boolean, default: false },
    enabled: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
);

EntitlementSchema.index({ userId: 1, serviceKey: 1 }, { unique: true });
EntitlementSchema.index({ serviceKey: 1, allowed: 1 });

export const Entitlement = mongoose.model<IEntitlement>('Entitlement', EntitlementSchema);
