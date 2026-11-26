import mongoose, { type ClientSession } from 'mongoose';
import { randomUUID } from 'node:crypto';
import type { IUser } from '../../interfaces/models.interface.js';
import { withTransaction } from '../../db/transaction.js';
import { Errors } from '../../core/http/errors.js';
import { assertServiceAccess } from '../catalog/entitlement.service.js';
import { quotePrice, type PriceQuote } from './pricing.service.js';
import { BillingAccount, UsageRecord, type IUsageRecord } from './billing.models.js';
import { ensureBillingAccount, postEntry } from './billingAccount.service.js';
import { AccountState, BillingMode, LedgerKind, UsageStatus } from './billing.constants.js';

type Chargeable = Pick<IUser, '_id' | 'role' | 'status' | 'parentId' | 'ancestors' | 'permissions' | 'isProtected'>;

export interface ChargeRequest {
  user: Chargeable;
  serviceKey: string;
  units: number;
  /**
   * Unique per billable event (e.g. `chat:msg:<messageId>`). Retrying with
   * the same key returns the original charge instead of charging twice.
   * Omit only for events that have no natural id.
   */
  idempotencyKey?: string;
  description: string;
  /** Run inside the caller's transaction (so the charge commits with its work). */
  session?: ClientSession | null | undefined;
  /** Skip the entitlement check (caller already enforced it). */
  skipAccessCheck?: boolean;
}

export interface ChargeResult {
  usage: IUsageRecord & { _id: mongoose.Types.ObjectId };
  duplicate: boolean;
}

/** Split a quote into per-hop amounts for `units`. */
const breakdown = (quote: PriceQuote, units: number) => ({
  total: quote.unitPrice * units,
  platformAmount: quote.platformPerUnit * units,
  hops: quote.hops.map((h) => ({
    resellerId: h.resellerId ? new mongoose.Types.ObjectId(h.resellerId) : null,
    markupPerUnit: h.markupPerUnit,
    amount: h.markupPerUnit * units,
  })),
});

/** Credit each reseller its markup (prepaid: now; postpaid: as pending). */
const distributeEarnings = async (
  session: ClientSession,
  usage: { _id: unknown; hops: { resellerId: mongoose.Types.ObjectId | null; amount: number }[]; userId: unknown; serviceKey: string },
  mode: 'settle' | 'pending',
) => {
  for (const hop of usage.hops) {
    if (!hop.resellerId || hop.amount <= 0) continue;
    await ensureBillingAccount({ _id: hop.resellerId, role: 'reseller' }, session);
    if (mode === 'pending') {
      await BillingAccount.updateOne({ userId: hop.resellerId }, { $inc: { pendingEarnings: hop.amount } }, { session });
    } else {
      await postEntry(session, {
        userId: hop.resellerId,
        direction: 'credit',
        kind: LedgerKind.MARKUP_CREDIT,
        amount: hop.amount,
        description: `Markup earned on ${usage.serviceKey}`,
        usageId: usage._id as mongoose.Types.ObjectId,
        counterpartyId: usage.userId as mongoose.Types.ObjectId,
        extraInc: { lifetimeEarnings: hop.amount },
      });
    }
  }
};

/**
 * Charge a user for service usage.
 *
 *  Prepaid  → the full customer price is debited from the wallet before the
 *             request proceeds (402 if the balance is short); reseller
 *             markups are credited to their wallets immediately.
 *  Postpaid → nothing is debited; the charge accrues to the open cycle
 *             (402 if it would exceed the credit limit); reseller markups
 *             are tracked as pending and credited when the invoice is paid.
 *  Unlimited (super admin) → recorded at base price, never blocked or debited.
 *
 * Everything runs in one transaction, keyed by `idempotencyKey`.
 */
export const chargeUsage = async (req: ChargeRequest): Promise<ChargeResult> => {
  if (!Number.isInteger(req.units) || req.units < 0) throw Errors.badRequest('Units must be a non-negative integer');
  if (!req.skipAccessCheck) await assertServiceAccess(req.user, req.serviceKey);

  const idempotencyKey = req.idempotencyKey ?? `auto:${randomUUID()}`;
  const existing = await UsageRecord.findOne({ idempotencyKey }).lean();
  if (existing) return { usage: existing as ChargeResult['usage'], duplicate: true };

  const quote = await quotePrice(req.user, req.serviceKey);
  const { total, platformAmount, hops } = breakdown(quote, req.units);

  try {
    const run = async (session: ClientSession): Promise<ChargeResult> => {
      const account = await ensureBillingAccount(req.user, session);
      if (account.state === AccountState.FROZEN) throw Errors.forbidden('Billing account is frozen. Contact your provider.');

      const base = {
        userId: req.user._id,
        ancestors: req.user.ancestors ?? [],
        serviceKey: req.serviceKey,
        units: req.units,
        basePrice: quote.basePrice,
        unitPrice: quote.unitPrice,
        hops,
        platformAmount,
        total,
        billingMode: account.mode,
        unlimited: account.isUnlimited,
        idempotencyKey,
        description: req.description.slice(0, 200),
      };

      // Unlimited and zero-cost charges never touch balances.
      if (account.isUnlimited || total === 0) {
        const [usage] = await UsageRecord.create([{ ...base, walletDebited: 0, status: UsageStatus.SETTLED }], { session });
        return { usage: usage!.toObject() as ChargeResult['usage'], duplicate: false };
      }

      if (account.mode === BillingMode.PREPAID) {
        // Debit first: if funds are short, the 402 is thrown before anything
        // is written, so a caller sharing this transaction can't commit a
        // half-recorded charge.
        const usageId = new mongoose.Types.ObjectId();
        await postEntry(session, {
          userId: req.user._id as mongoose.Types.ObjectId,
          direction: 'debit',
          kind: LedgerKind.USAGE_DEBIT,
          amount: total,
          description: req.description.slice(0, 200) || `${req.serviceKey} usage`,
          usageId,
        });
        const [usage] = await UsageRecord.create([{ _id: usageId, ...base, walletDebited: total, status: UsageStatus.SETTLED }], { session });
        await distributeEarnings(session, usage!, 'settle');
        return { usage: usage!.toObject() as ChargeResult['usage'], duplicate: false };
      }

      // Postpaid: atomically reserve credit.
      const limitGuard = account.creditLimit === null
        ? {}
        : { $expr: { $lte: [{ $add: ['$unbilled', '$outstanding', total] }, account.creditLimit] } };
      const reserved = await BillingAccount.findOneAndUpdate(
        { _id: account._id, ...limitGuard },
        { $inc: { unbilled: total } },
        { session, returnDocument: 'after' },
      );
      if (!reserved) {
        throw Errors.paymentRequired('Postpaid credit limit reached', {
          creditLimit: account.creditLimit, unbilled: account.unbilled, outstanding: account.outstanding, required: total,
        });
      }
      const [usage] = await UsageRecord.create([{ ...base, walletDebited: 0, status: UsageStatus.UNBILLED }], { session });
      await distributeEarnings(session, usage!, 'pending');
      return { usage: usage!.toObject() as ChargeResult["usage"], duplicate: false };
    };
    return req.session ? await run(req.session) : await withTransaction(run);
  } catch (err) {
    // A concurrent request with the same key won the race: return its record.
    if ((err as { code?: number })?.code === 11000) {
      const winner = await UsageRecord.findOne({ idempotencyKey }).lean();
      if (winner) return { usage: winner as ChargeResult['usage'], duplicate: true };
    }
    throw err;
  }
};

/** Pre-flight check without charging (used before expensive work). */
export const canAfford = async (user: Chargeable, serviceKey: string, units: number): Promise<{ ok: boolean; total: number }> => {
  const quote = await quotePrice(user, serviceKey);
  const total = quote.unitPrice * units;
  const account = await ensureBillingAccount(user);
  if (account.isUnlimited || total === 0) return { ok: true, total };
  if (account.state === AccountState.FROZEN) return { ok: false, total };
  if (account.mode === BillingMode.PREPAID) return { ok: account.balance >= total, total };
  return { ok: account.creditLimit === null || account.unbilled + account.outstanding + total <= account.creditLimit, total };
};
