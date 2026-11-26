import mongoose, { type ClientSession } from 'mongoose';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { User } from '../../models/user.model.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { withTransaction } from '../../db/transaction.js';
import { Errors } from '../../core/http/errors.js';
import { hasPermission, isInSubtree, type AccessSubject } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';
import { audit } from '../audit/audit.service.js';
import { BillingAccount, Invoice, UsageRecord, type IInvoice } from './billing.models.js';
import { ensureBillingAccount, postEntry } from './billingAccount.service.js';
import {
  BillingMode, INVOICE_DUE_DAYS, InvoicePaymentMethod, InvoiceStatus, LedgerKind, UsageStatus,
} from './billing.constants.js';

type Actor = AccessSubject & Pick<IUser, 'name'>;
type Ctx = Pick<Request, 'user' | 'ip' | 'socket' | 'headers'>;
type Id = mongoose.Types.ObjectId;

const invoiceNumber = (at: Date) =>
  `INV-${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}-${randomBytes(4).toString('hex').toUpperCase()}`;

/** Next cycle-close date on or after `from` for a given day of month. */
export const nextCycleClose = (cycleStart: Date, cycleDay: number): Date => {
  const d = new Date(Date.UTC(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth(), cycleDay));
  if (d <= cycleStart) d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
};

/**
 * Close the open postpaid cycle for one user: gather unbilled usage up to
 * `periodEnd` into an invoice and move the amount from `unbilled` to
 * `outstanding`. Returns null when there was nothing to bill.
 */
export const closeCycle = async (userId: Id | string, periodEnd: Date, ctx: Ctx | null = null): Promise<IInvoice | null> =>
  withTransaction(async (session) => {
    const account = await BillingAccount.findOne({ userId }).session(session);
    if (!account) return null;
    const usages = await UsageRecord.find({ userId, status: UsageStatus.UNBILLED, createdAt: { $lte: periodEnd } })
      .session(session).select('_id serviceKey units total').lean();
    const periodStart = account.cycleStart;
    account.cycleStart = periodEnd;
    if (!usages.length) {
      await account.save({ session });
      return null;
    }

    const lines = new Map<string, { serviceKey: string; units: number; amount: number; records: number }>();
    let total = 0;
    for (const u of usages) {
      const line = lines.get(u.serviceKey) ?? { serviceKey: u.serviceKey, units: 0, amount: 0, records: 0 };
      line.units += u.units;
      line.amount += u.total;
      line.records += 1;
      lines.set(u.serviceKey, line);
      total += u.total;
    }

    const user = await User.findById(userId).select('ancestors').session(session).lean();
    const [invoice] = await Invoice.create([{
      number: invoiceNumber(periodEnd),
      userId, ancestors: user?.ancestors ?? [],
      periodStart, periodEnd,
      lines: [...lines.values()],
      total,
      status: InvoiceStatus.ISSUED,
      dueAt: new Date(periodEnd.getTime() + INVOICE_DUE_DAYS * 86_400_000),
    }], { session });

    await UsageRecord.updateMany(
      { _id: { $in: usages.map((u) => u._id) } },
      { $set: { status: UsageStatus.INVOICED, invoiceId: invoice!._id } },
      { session },
    );
    account.unbilled -= total;
    account.outstanding += total;
    await account.save({ session });
    await audit(ctx, { action: 'billing.invoice_issued', targetType: 'invoice', targetId: String(invoice!._id), targetAncestors: user?.ancestors, changes: { total, usages: usages.length } }, session);
    return invoice!.toObject();
  });

/** Close every postpaid cycle that is due as of `now` (scheduled job + staff trigger). */
export const generateDueInvoices = async (now = new Date()): Promise<{ checked: number; issued: number }> => {
  const accounts = await BillingAccount.find({ mode: BillingMode.POSTPAID }).select('userId cycleStart cycleDay').lean();
  let issued = 0;
  for (const a of accounts) {
    const close = nextCycleClose(a.cycleStart, a.cycleDay);
    if (close > now) continue;
    try {
      if (await closeCycle(a.userId, close)) issued += 1;
    } catch (err) {
      console.error(`[billing] closing cycle for ${String(a.userId)} failed:`, err);
    }
  }
  return { checked: accounts.length, issued };
};

/** Credit resellers the markups that were pending on this invoice's usage. */
const settleEarnings = async (session: ClientSession, invoice: IInvoice & { _id: Id }, skipResellerId?: string) => {
  const usages = await UsageRecord.find({ invoiceId: invoice._id }).session(session).select('_id hops serviceKey userId').lean();
  const perReseller = new Map<string, number>();
  for (const u of usages) {
    for (const h of u.hops) {
      if (!h.resellerId || h.amount <= 0) continue;
      const k = String(h.resellerId);
      perReseller.set(k, (perReseller.get(k) ?? 0) + h.amount);
    }
  }
  for (const [resellerId, amount] of perReseller) {
    await ensureBillingAccount({ _id: resellerId, role: 'reseller' }, session);
    if (resellerId === skipResellerId) {
      // The collecting reseller already kept its margin offline: just clear it from pending.
      await BillingAccount.updateOne({ userId: resellerId }, { $inc: { pendingEarnings: -amount } }, { session });
      continue;
    }
    await postEntry(session, {
      userId: resellerId, direction: 'credit', kind: LedgerKind.MARKUP_CREDIT, amount,
      description: `Markup earned on invoice ${invoice.number}`, invoiceId: invoice._id, counterpartyId: invoice.userId,
      extraInc: { pendingEarnings: -amount, lifetimeEarnings: amount },
    });
  }
  await UsageRecord.updateMany({ invoiceId: invoice._id }, { $set: { status: UsageStatus.SETTLED, walletDebited: 0 } }, { session });
  return perReseller;
};

/**
 * Pay an issued invoice.
 *  - wallet:   the customer pays from its own wallet balance (self, or staff).
 *  - provider: the customer's direct reseller collected payment itself and
 *              pays everything except its own margin from its wallet;
 *              upstream resellers' margins are credited.
 *  - offline:  platform recorded an external payment (super admin / billing.manage).
 */
export const payInvoice = async (
  ctx: Ctx, actor: Actor, invoiceId: string, method: InvoicePaymentMethod, reference?: string,
) => {
  if (!mongoose.isValidObjectId(invoiceId)) throw Errors.notFound('Invoice');
  return withTransaction(async (session) => {
    const invoice = await Invoice.findOne({ _id: invoiceId, status: InvoiceStatus.ISSUED }).session(session);
    if (!invoice) throw Errors.notFound('Unpaid invoice');
    const customer = await User.findById(invoice.userId).session(session);
    if (!customer) throw Errors.notFound('User');
    const isOwner = String(actor._id) === String(customer._id);

    let skipReseller: string | undefined;
    if (method === InvoicePaymentMethod.WALLET) {
      if (!isOwner && !hasPermission(actor, Permission.BILLING_MANAGE)) throw Errors.forbidden();
      await postEntry(session, {
        userId: customer._id, direction: 'debit', kind: LedgerKind.INVOICE_PAYMENT, amount: invoice.total,
        description: `Payment for invoice ${invoice.number}`, invoiceId: invoice._id, createdBy: actor._id as Id,
        extraInc: { outstanding: -invoice.total },
      });
    } else if (method === InvoicePaymentMethod.PROVIDER) {
      if (!customer.parentId || String(customer.parentId) !== String(actor._id) || !isInSubtree(actor, customer)) {
        throw Errors.forbidden('Only the customer’s own reseller can settle on its behalf');
      }
      const ownMargin = await UsageRecord.aggregate<{ sum: number }>([
        { $match: { invoiceId: invoice._id } },
        { $unwind: '$hops' },
        { $match: { 'hops.resellerId': actor._id } },
        { $group: { _id: null, sum: { $sum: '$hops.amount' } } },
      ]).session(session);
      const upstreamShare = invoice.total - (ownMargin[0]?.sum ?? 0);
      await postEntry(session, {
        userId: actor._id as Id, direction: 'debit', kind: LedgerKind.PROVIDER_SETTLEMENT, amount: upstreamShare,
        description: `Settled customer invoice ${invoice.number}`, invoiceId: invoice._id, counterpartyId: customer._id, createdBy: actor._id as Id,
      });
      await BillingAccount.updateOne({ userId: customer._id }, { $inc: { outstanding: -invoice.total } }, { session });
      skipReseller = String(actor._id);
    } else {
      if (!hasPermission(actor, Permission.BILLING_MANAGE)) throw Errors.forbidden();
      if (!reference) throw Errors.badRequest('A payment reference is required for offline payments');
      await BillingAccount.updateOne({ userId: customer._id }, { $inc: { outstanding: -invoice.total } }, { session });
    }

    await settleEarnings(session, invoice as never, skipReseller);
    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.paymentMethod = method;
    if (reference) invoice.paymentReference = reference;
    invoice.paidBy = actor._id as Id;
    await invoice.save({ session });
    await audit(ctx, { action: 'billing.invoice_paid', targetType: 'invoice', targetId: invoiceId, targetAncestors: customer.ancestors, changes: { method, total: invoice.total, reference } }, session);
    return invoice.toObject();
  });
};

/** Manager changes an account's billing mode / limits. */
export const configureBilling = async (
  ctx: Ctx, actor: Actor, target: AccessSubject & { _id: unknown; parentId?: unknown },
  input: { mode?: BillingMode | undefined; creditLimit?: number | null | undefined; cycleDay?: number | undefined },
) => {
  const account = await ensureBillingAccount(target as never);
  if (account.isUnlimited) throw Errors.forbidden('This account is protected');
  // Only staff may grant unlimited postpaid credit.
  if (input.creditLimit === null && !hasPermission(actor, Permission.BILLING_MANAGE)) {
    throw Errors.forbidden('Only the platform can grant unlimited postpaid credit');
  }
  if (input.mode && input.mode !== account.mode) {
    if (account.mode === BillingMode.POSTPAID && (account.unbilled > 0 || account.outstanding > 0)) {
      throw Errors.badRequest('Close the cycle and settle outstanding invoices before switching to prepaid');
    }
    if (input.mode === BillingMode.POSTPAID) account.cycleStart = new Date();
    account.mode = input.mode;
  }
  if (input.creditLimit !== undefined) account.creditLimit = input.creditLimit;
  if (input.cycleDay !== undefined) account.cycleDay = input.cycleDay;
  await account.save();
  await audit(ctx, { action: 'billing.configure', targetType: 'user', targetId: String(target._id), targetAncestors: target.ancestors, changes: input });
  return account;
};
