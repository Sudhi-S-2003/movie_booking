import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { BillingAccount, LedgerEntry, type IBillingAccount } from './billing.models.js';
import { BillingMode, type LedgerKind } from './billing.constants.js';
import { UserRole } from '../../constants/enums.js';
import { runAsSystem } from '../../db/systemContext.js';
import { Errors } from '../../core/http/errors.js';

type Id = mongoose.Types.ObjectId | string;

/** Get (or lazily create) the billing account for a user. */
export const ensureBillingAccount = async (
  user: { _id: Id; role: string },
  session?: ClientSession,
): Promise<mongoose.HydratedDocument<IBillingAccount>> => {
  const account = await BillingAccount.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id, mode: BillingMode.PREPAID, cycleStart: new Date() } },
    { upsert: true, returnDocument: 'after', session: session ?? null },
  );
  return account!;
};

/** Mark the super admin's wallet unlimited (system bootstrap only). */
export const ensureUnlimitedWallet = async (userId: Id): Promise<void> => {
  await runAsSystem('unlimited wallet bootstrap', async () => {
    const account = await ensureBillingAccount({ _id: userId, role: UserRole.SUPER_ADMIN });
    if (!account.isUnlimited) {
      account.isUnlimited = true;
      await account.save();
    }
  });
};

export interface PostEntryArgs {
  userId: Id;
  direction: 'credit' | 'debit';
  kind: LedgerKind;
  amount: number;
  description: string;
  createdBy?: Id | null;
  usageId?: Id;
  invoiceId?: Id;
  transferId?: string;
  counterpartyId?: Id;
  /** Also adjust these counters atomically with the balance. */
  extraInc?: Partial<Record<'pendingEarnings' | 'lifetimeEarnings' | 'outstanding' | 'unbilled', number>>;
}

/**
 * Move money in or out of one account and write its ledger entry, inside
 * the caller's transaction. Debits are conditional on sufficient balance
 * (atomic `$gte` guard), so concurrent requests can never overdraw.
 * Unlimited accounts record the entry but their balance never changes.
 */
export const postEntry = async (session: ClientSession, args: PostEntryArgs) => {
  if (!Number.isInteger(args.amount) || args.amount < 0) throw Errors.badRequest('Amount must be a non-negative integer');
  const account = await BillingAccount.findOne({ userId: args.userId }).session(session);
  if (!account) throw Errors.notFound('Billing account');

  let balanceAfter: number | null = null;
  if (account.isUnlimited && args.direction === 'debit') {
    if (args.extraInc && Object.keys(args.extraInc).length) {
      await BillingAccount.updateOne({ _id: account._id }, { $inc: args.extraInc }, { session });
    }
  } else {
    const delta = args.direction === 'credit' ? args.amount : -args.amount;
    const filter: Record<string, unknown> = { _id: account._id };
    if (args.direction === 'debit') filter.balance = { $gte: args.amount };
    const updated = await BillingAccount.findOneAndUpdate(
      filter,
      { $inc: { balance: delta, ...(args.extraInc ?? {}) } },
      { session, returnDocument: 'after' },
    );
    if (!updated) throw Errors.paymentRequired('Insufficient wallet balance', { required: args.amount, balance: account.balance });
    balanceAfter = account.isUnlimited ? null : updated.balance;
  }

  const [entry] = await LedgerEntry.create(
    [{
      userId: args.userId,
      direction: args.direction,
      kind: args.kind,
      amount: args.amount,
      balanceAfter,
      description: args.description,
      createdBy: args.createdBy ?? null,
      ...(args.usageId ? { usageId: args.usageId } : {}),
      ...(args.invoiceId ? { invoiceId: args.invoiceId } : {}),
      ...(args.transferId ? { transferId: args.transferId } : {}),
      ...(args.counterpartyId ? { counterpartyId: args.counterpartyId } : {}),
    }],
    { session },
  );
  return entry!;
};

/** Public summary of a billing account. */
export const toAccountSummary = (a: IBillingAccount) => ({
  mode: a.mode,
  currency: a.currency,
  balance: a.balance,
  creditLimit: a.creditLimit,
  unbilled: a.unbilled,
  outstanding: a.outstanding,
  availableCredit: a.mode === BillingMode.POSTPAID && a.creditLimit !== null ? Math.max(0, a.creditLimit - a.unbilled - a.outstanding) : null,
  pendingEarnings: a.pendingEarnings,
  lifetimeEarnings: a.lifetimeEarnings,
  state: a.state,
  isUnlimited: a.isUnlimited,
  cycleDay: a.cycleDay,
  cycleStart: a.cycleStart,
});
