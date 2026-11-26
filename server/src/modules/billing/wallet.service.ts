import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import type { Request } from 'express';
import { User } from '../../models/user.model.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { withTransaction } from '../../db/transaction.js';
import { Errors } from '../../core/http/errors.js';
import { canManageUser, hasPermission, type AccessSubject } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';
import { audit } from '../audit/audit.service.js';
import { BillingAccount, LedgerEntry } from './billing.models.js';
import { ensureBillingAccount, postEntry } from './billingAccount.service.js';
import { LedgerKind } from './billing.constants.js';

type Actor = AccessSubject & Pick<IUser, 'name'>;
type Ctx = Pick<Request, 'user' | 'ip' | 'socket' | 'headers'>;

const loadManagedTarget = async (actor: Actor, targetId: string) => {
  if (!mongoose.isValidObjectId(targetId)) throw Errors.notFound('User');
  const target = await User.findById(targetId);
  if (!target || !canManageUser(actor, target)) throw Errors.notFound('User');
  return target;
};

/**
 * Reseller (or staff) moves prepaid credit from its own wallet to an
 * account it manages. Both legs + audit are one transaction; the debit is
 * balance-guarded. The super admin's wallet is unlimited, so its transfers
 * never reduce its balance.
 */
export const transfer = async (ctx: Ctx, actor: Actor, targetId: string, amount: number, note: string) => {
  if (!hasPermission(actor, Permission.WALLET_TRANSFER)) throw Errors.forbidden();
  const target = await loadManagedTarget(actor, targetId);
  const transferId = `trf_${randomUUID()}`;
  await withTransaction(async (session) => {
    await ensureBillingAccount(actor, session);
    await ensureBillingAccount(target, session);
    await postEntry(session, {
      userId: actor._id as mongoose.Types.ObjectId, direction: 'debit', kind: LedgerKind.TRANSFER_OUT, amount,
      description: `Transfer to ${target.username}${note ? `: ${note}` : ''}`, transferId, counterpartyId: target._id, createdBy: actor._id as mongoose.Types.ObjectId,
    });
    await postEntry(session, {
      userId: target._id, direction: 'credit', kind: LedgerKind.TRANSFER_IN, amount,
      description: `Transfer from ${actor.name}${note ? `: ${note}` : ''}`, transferId, counterpartyId: actor._id as mongoose.Types.ObjectId, createdBy: actor._id as mongoose.Types.ObjectId,
    });
    await audit(ctx, { action: 'wallet.transfer', targetType: 'user', targetId: String(target._id), targetAncestors: target.ancestors, changes: { amount, transferId, note } }, session);
  });
  return { transferId };
};

/**
 * Platform top-up: credit an account after payment was received outside
 * the system (bank transfer, gateway settlement). Super admin only.
 */
export const topUp = async (ctx: Ctx, actor: Actor, targetId: string, amount: number, reference: string) => {
  if (!hasPermission(actor, Permission.WALLET_MINT)) throw Errors.forbidden();
  if (!mongoose.isValidObjectId(targetId)) throw Errors.notFound('User');
  const target = await User.findById(targetId);
  if (!target) throw Errors.notFound('User');
  await withTransaction(async (session) => {
    await ensureBillingAccount(target, session);
    await postEntry(session, {
      userId: target._id, direction: 'credit', kind: LedgerKind.TOPUP, amount,
      description: `Top-up (${reference})`, createdBy: actor._id as mongoose.Types.ObjectId,
    });
    await audit(ctx, { action: 'wallet.topup', targetType: 'user', targetId, targetAncestors: target.ancestors, changes: { amount, reference } }, session);
  });
};

/** Super-admin correction (credit or debit) with a mandatory reason. */
export const adjust = async (
  ctx: Ctx, actor: Actor, targetId: string, direction: 'credit' | 'debit', amount: number, reason: string,
) => {
  if (!hasPermission(actor, Permission.WALLET_ADJUST)) throw Errors.forbidden();
  if (!mongoose.isValidObjectId(targetId)) throw Errors.notFound('User');
  const target = await User.findById(targetId);
  if (!target) throw Errors.notFound('User');
  await withTransaction(async (session) => {
    await ensureBillingAccount(target, session);
    await postEntry(session, {
      userId: target._id, direction, kind: LedgerKind.ADJUSTMENT, amount,
      description: `Adjustment: ${reason}`, createdBy: actor._id as mongoose.Types.ObjectId,
    });
    await audit(ctx, { action: 'wallet.adjust', targetType: 'user', targetId, targetAncestors: target.ancestors, changes: { direction, amount, reason } }, session);
  });
};

export const listLedger = async (userId: mongoose.Types.ObjectId, page: number, limit: number) => {
  const filter = { userId };
  const [items, total] = await Promise.all([
    LedgerEntry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    LedgerEntry.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

/** Freeze or unfreeze an account's spending (manager action). */
export const setFrozen = async (ctx: Ctx, actor: Actor, targetId: string, frozen: boolean) => {
  if (!hasPermission(actor, Permission.USERS_SUSPEND)) throw Errors.forbidden();
  const target = await loadManagedTarget(actor, targetId);
  await ensureBillingAccount(target);
  await BillingAccount.updateOne({ userId: target._id }, { $set: { state: frozen ? 'frozen' : 'active' } });
  await audit(ctx, { action: frozen ? 'billing.freeze' : 'billing.unfreeze', targetType: 'user', targetId, targetAncestors: target.ancestors });
};
