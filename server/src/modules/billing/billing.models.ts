import mongoose, { Schema, type Query, type UpdateQuery } from 'mongoose';
import {
  AccountState, BillingMode, InvoicePaymentMethod, InvoiceStatus, LedgerKind, MarkupType,
  PriceRuleScope, UsageStatus, PLATFORM_CURRENCY,
} from './billing.constants.js';
import { isSystemContext, ProtectedRecordError } from '../../db/systemContext.js';

const int = { validator: Number.isInteger, message: '{PATH} must be an integer (micros)' };
type Id = mongoose.Types.ObjectId;

// ─── Billing account (wallet) ───────────────────────────────────────────────

export interface IBillingAccount {
  userId: Id;
  mode: BillingMode;
  currency: string;
  /** Spendable funds (micros). Never negative. */
  balance: number;
  /** Postpaid: max unbilled + outstanding (micros). null = no limit. */
  creditLimit: number | null;
  /** Postpaid charges in the open cycle, not yet invoiced. */
  unbilled: number;
  /** Issued, unpaid postpaid invoices. */
  outstanding: number;
  /** Reseller markups from postpaid customers, credited when their invoices are paid. */
  pendingEarnings: number;
  lifetimeEarnings: number;
  state: AccountState;
  /** System-only: never blocked, balance never reduced (protected super admin). */
  isUnlimited: boolean;
  /** Day of month (1-28) the postpaid cycle closes. */
  cycleDay: number;
  /** Start of the currently open postpaid cycle. */
  cycleStart: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BillingAccountSchema = new Schema<IBillingAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    mode: { type: String, enum: Object.values(BillingMode), default: BillingMode.PREPAID },
    currency: { type: String, default: PLATFORM_CURRENCY },
    balance: { type: Number, default: 0, min: 0, validate: int },
    creditLimit: { type: Number, default: 0, min: 0, validate: { validator: (v: number | null) => v === null || Number.isInteger(v) } },
    unbilled: { type: Number, default: 0, min: 0, validate: int },
    outstanding: { type: Number, default: 0, min: 0, validate: int },
    pendingEarnings: { type: Number, default: 0, min: 0, validate: int },
    lifetimeEarnings: { type: Number, default: 0, min: 0, validate: int },
    state: { type: String, enum: Object.values(AccountState), default: AccountState.ACTIVE },
    isUnlimited: { type: Boolean, default: false },
    cycleDay: { type: Number, default: 1, min: 1, max: 28 },
    cycleStart: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);
BillingAccountSchema.index({ mode: 1, cycleStart: 1 });

// `isUnlimited` can only be set by the system bootstrap.
BillingAccountSchema.pre('save', function () {
  if (!isSystemContext() && this.isModified('isUnlimited') && this.isUnlimited) {
    throw new ProtectedRecordError('Unlimited wallets can only be configured by the system');
  }
});
BillingAccountSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (this: Query<unknown, IBillingAccount>) {
  if (isSystemContext()) return;
  const update = (this.getUpdate() ?? {}) as UpdateQuery<IBillingAccount>;
  const touches = 'isUnlimited' in update || Object.values(update).some((v) => v && typeof v === 'object' && 'isUnlimited' in v);
  if (touches) throw new ProtectedRecordError('Unlimited wallets can only be configured by the system');
});

export const BillingAccount = mongoose.model<IBillingAccount>('BillingAccount', BillingAccountSchema);

// ─── Ledger (immutable) ─────────────────────────────────────────────────────

export interface ILedgerEntry {
  userId: Id;
  direction: 'credit' | 'debit';
  kind: LedgerKind;
  amount: number;
  /** Balance after this entry; null for unlimited accounts. */
  balanceAfter: number | null;
  usageId?: Id;
  invoiceId?: Id;
  transferId?: string;
  counterpartyId?: Id;
  description: string;
  createdBy?: Id | null;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    kind: { type: String, enum: Object.values(LedgerKind), required: true },
    amount: { type: Number, required: true, min: 0, validate: int },
    balanceAfter: { type: Number, default: null },
    usageId: { type: Schema.Types.ObjectId, ref: 'UsageRecord' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    transferId: { type: String },
    counterpartyId: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, required: true, maxlength: 300 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
LedgerEntrySchema.index({ userId: 1, createdAt: -1 });
LedgerEntrySchema.index({ transferId: 1 }, { sparse: true });
LedgerEntrySchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'], () => {
  throw new Error('Ledger entries are immutable');
});

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);

// ─── Usage records (one per metered request) ────────────────────────────────

export interface IPriceHop {
  /** Reseller earning this markup (null = platform). */
  resellerId: Id | null;
  markupPerUnit: number;
  amount: number;
}

export interface IUsageRecord {
  userId: Id;
  /** Owning-reseller path of the user at charge time. */
  ancestors: Id[];
  serviceKey: string;
  units: number;
  basePrice: number;
  unitPrice: number;
  /** Price breakdown per hop down the reseller chain. */
  hops: IPriceHop[];
  /** base + platform-defined markups, i.e. what the platform keeps. */
  platformAmount: number;
  total: number;
  /** Amount actually taken from the wallet (0 for postpaid until paid, and for unlimited). */
  walletDebited: number;
  billingMode: BillingMode;
  status: UsageStatus;
  unlimited: boolean;
  invoiceId?: Id;
  idempotencyKey: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const PriceHopSchema = new Schema<IPriceHop>(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    markupPerUnit: { type: Number, required: true, validate: int },
    amount: { type: Number, required: true, validate: int },
  },
  { _id: false },
);

const UsageRecordSchema = new Schema<IUsageRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ancestors: { type: [Schema.Types.ObjectId], default: [] },
    serviceKey: { type: String, required: true },
    units: { type: Number, required: true, min: 0, validate: int },
    basePrice: { type: Number, required: true, validate: int },
    unitPrice: { type: Number, required: true, validate: int },
    hops: { type: [PriceHopSchema], default: [] },
    platformAmount: { type: Number, required: true, validate: int },
    total: { type: Number, required: true, min: 0, validate: int },
    walletDebited: { type: Number, required: true, min: 0, validate: int },
    billingMode: { type: String, enum: Object.values(BillingMode), required: true },
    status: { type: String, enum: Object.values(UsageStatus), required: true },
    unlimited: { type: Boolean, default: false },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    idempotencyKey: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true },
);
UsageRecordSchema.index({ userId: 1, createdAt: -1 });
UsageRecordSchema.index({ userId: 1, status: 1, createdAt: 1 });
UsageRecordSchema.index({ ancestors: 1, createdAt: -1 });
UsageRecordSchema.index({ 'hops.resellerId': 1, createdAt: -1 });
UsageRecordSchema.index({ serviceKey: 1, createdAt: -1 });

export const UsageRecord = mongoose.model<IUsageRecord>('UsageRecord', UsageRecordSchema);

// ─── Price rules (markups) ──────────────────────────────────────────────────

export interface IPriceRule {
  scope: PriceRuleScope;
  /** Reseller the rule applies to (scope=reseller) or that defined it (scope=customer). */
  resellerId: Id;
  /** scope=customer: a specific customer, or null for the reseller's default. */
  customerId: Id | null;
  serviceKey: string;
  type: MarkupType;
  /** percent: basis points (1250 = 12.5%); fixed: micros per unit. */
  value: number;
  setBy: Id;
  createdAt: Date;
  updatedAt: Date;
}

const PriceRuleSchema = new Schema<IPriceRule>(
  {
    scope: { type: String, enum: Object.values(PriceRuleScope), required: true },
    resellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    serviceKey: { type: String, required: true },
    type: { type: String, enum: Object.values(MarkupType), required: true },
    value: { type: Number, required: true, min: 0, validate: int },
    setBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
PriceRuleSchema.index({ scope: 1, resellerId: 1, customerId: 1, serviceKey: 1 }, { unique: true });

export const PriceRule = mongoose.model<IPriceRule>('PriceRule', PriceRuleSchema);

// ─── Invoices (postpaid) ────────────────────────────────────────────────────

export interface IInvoiceLine {
  serviceKey: string;
  units: number;
  amount: number;
  records: number;
}

export interface IInvoice {
  number: string;
  userId: Id;
  ancestors: Id[];
  periodStart: Date;
  periodEnd: Date;
  lines: IInvoiceLine[];
  total: number;
  status: InvoiceStatus;
  dueAt: Date;
  paidAt?: Date;
  paymentMethod?: InvoicePaymentMethod;
  paymentReference?: string;
  paidBy?: Id;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    number: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ancestors: { type: [Schema.Types.ObjectId], default: [] },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    lines: [{ _id: false, serviceKey: String, units: Number, amount: Number, records: Number }],
    total: { type: Number, required: true, min: 0, validate: int },
    status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.ISSUED },
    dueAt: { type: Date, required: true },
    paidAt: { type: Date },
    paymentMethod: { type: String, enum: Object.values(InvoicePaymentMethod) },
    paymentReference: { type: String, maxlength: 200 },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
InvoiceSchema.index({ userId: 1, createdAt: -1 });
InvoiceSchema.index({ ancestors: 1, status: 1 });
InvoiceSchema.index({ status: 1, dueAt: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
