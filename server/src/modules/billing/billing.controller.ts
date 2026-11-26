import mongoose from 'mongoose';
import type { Request } from 'express';
import { asyncHandler, parse, ok, actorOf } from '../../core/http/handler.js';
import { Errors } from '../../core/http/errors.js';
import { User } from '../../models/user.model.js';
import { UserRole } from '../../constants/enums.js';
import { canManageUser, canViewUser, hasPermission } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';
import { ensureBillingAccount, toAccountSummary } from './billingAccount.service.js';
import { quotePrice } from './pricing.service.js';
import * as Wallet from './wallet.service.js';
import * as Invoices from './invoice.service.js';
import * as Pricing from './pricingAdmin.service.js';
import * as Reports from './reports.service.js';
import { Invoice } from './billing.models.js';
import {
  pageQuerySchema, transferSchema, topUpSchema, adjustSchema, configureBillingSchema, markupSchema,
  customerMarkupSchema, payInvoiceSchema, quoteQuerySchema, invoiceQuerySchema,
} from './billing.schemas.js';

/** Load an account the actor may view (self, manager, or staff with billing.read_all). */
const viewableUser = async (req: Request) => {
  const actor = actorOf(req);
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw Errors.notFound('User');
  const target = await User.findById(id);
  const staffRead = hasPermission(actor, Permission.BILLING_READ_ALL);
  if (!target || !(staffRead || canViewUser(actor, target))) throw Errors.notFound('User');
  return target;
};

// ── Own account ─────────────────────────────────────────────────────────────
export const mySummary = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const account = await ensureBillingAccount(actor);
  const usage = await Reports.usageByService(actor._id);
  const earnings = actor.role === UserRole.RESELLER || actor.role === UserRole.SUPER_ADMIN ? await Reports.resellerOverview(actor._id) : null;
  ok(res, { account: toAccountSummary(account), usageByService: usage, earnings });
});
export const myLedger = asyncHandler(async (req, res) => {
  const q = parse(pageQuerySchema, req.query);
  ok(res, await Wallet.listLedger(actorOf(req)._id, q.page, q.limit));
});
export const myUsage = asyncHandler(async (req, res) => {
  const q = parse(pageQuerySchema, req.query);
  ok(res, await Reports.listUsage(actorOf(req)._id, q.page, q.limit, q.serviceKey));
});
export const quote = asyncHandler(async (req, res) => {
  const q = parse(quoteQuerySchema, req.query);
  const price = await quotePrice(actorOf(req), q.serviceKey);
  // Customers see only their own price, not the reseller margins above them.
  ok(res, { serviceKey: q.serviceKey, unitPrice: price.unitPrice, units: q.units, total: price.unitPrice * q.units });
});

// ── Invoices ────────────────────────────────────────────────────────────────
export const listInvoices = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const q = parse(invoiceQuerySchema, req.query);
  const filter: Record<string, unknown> = {};
  if (hasPermission(actor, Permission.BILLING_READ_ALL)) {
    if (q.userId) filter.userId = q.userId;
  } else if (actor.role === UserRole.RESELLER) {
    filter.$or = [{ userId: actor._id }, { ancestors: actor._id }];
    if (q.userId) filter.userId = q.userId;
  } else {
    filter.userId = actor._id;
  }
  if (q.status) filter.status = q.status;
  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('userId', 'name username').lean(),
    Invoice.countDocuments(filter),
  ]);
  ok(res, { items, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) } });
});
export const payInvoice = asyncHandler(async (req, res) => {
  const { method, reference } = parse(payInvoiceSchema, req.body);
  ok(res, await Invoices.payInvoice(req, actorOf(req), String(req.params.id), method, reference));
});
export const runBillingCycle = asyncHandler(async (_req, res) => { ok(res, await Invoices.generateDueInvoices()); });
export const closeUserCycle = asyncHandler(async (req, res) => {
  const target = await viewableUser(req);
  const actor = actorOf(req);
  if (!hasPermission(actor, Permission.BILLING_MANAGE) && !canManageUser(actor, target)) throw Errors.forbidden();
  ok(res, await Invoices.closeCycle(target._id, new Date(), req));
});

// ── Wallet operations ──────────────────────────────────────────────────────
export const transfer = asyncHandler(async (req, res) => {
  const b = parse(transferSchema, req.body);
  ok(res, await Wallet.transfer(req, actorOf(req), b.toUserId, b.amount, b.note), 201);
});
export const topUp = asyncHandler(async (req, res) => {
  const b = parse(topUpSchema, req.body);
  await Wallet.topUp(req, actorOf(req), b.userId, b.amount, b.reference);
  ok(res, { credited: b.amount }, 201);
});
export const adjust = asyncHandler(async (req, res) => {
  const b = parse(adjustSchema, req.body);
  await Wallet.adjust(req, actorOf(req), b.userId, b.direction, b.amount, b.reason);
  ok(res, { adjusted: b.amount, direction: b.direction }, 201);
});

// ── Managed accounts ───────────────────────────────────────────────────────
export const userSummary = asyncHandler(async (req, res) => {
  const target = await viewableUser(req);
  const account = await ensureBillingAccount(target);
  ok(res, { account: toAccountSummary(account), usageByService: await Reports.usageByService(target._id) });
});
export const userLedger = asyncHandler(async (req, res) => {
  const target = await viewableUser(req);
  const q = parse(pageQuerySchema, req.query);
  ok(res, await Wallet.listLedger(target._id, q.page, q.limit));
});
export const userUsage = asyncHandler(async (req, res) => {
  const target = await viewableUser(req);
  const q = parse(pageQuerySchema, req.query);
  ok(res, await Reports.listUsage(target._id, q.page, q.limit, q.serviceKey));
});
export const configureUserBilling = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const target = await viewableUser(req);
  if (!hasPermission(actor, Permission.BILLING_CUSTOMERS) || !canManageUser(actor, target)) throw Errors.forbidden();
  const account = await Invoices.configureBilling(req, actor, target, parse(configureBillingSchema, req.body));
  ok(res, toAccountSummary(account));
});
export const freezeUser = asyncHandler(async (req, res) => {
  await Wallet.setFrozen(req, actorOf(req), String(req.params.id), req.body?.frozen !== false);
  ok(res, { frozen: req.body?.frozen !== false });
});

// ── Pricing ─────────────────────────────────────────────────────────────────
export const listPriceRules = asyncHandler(async (req, res) => {
  const resellerId = typeof req.query.resellerId === 'string' ? req.query.resellerId : undefined;
  ok(res, await Pricing.listRules(actorOf(req), resellerId));
});
export const setResellerMarkup = asyncHandler(async (req, res) => {
  ok(res, await Pricing.setResellerMarkup(req, actorOf(req), String(req.params.id), parse(markupSchema, req.body)));
});
export const setCustomerMarkup = asyncHandler(async (req, res) => {
  const b = parse(customerMarkupSchema, req.body);
  ok(res, await Pricing.setCustomerMarkup(req, actorOf(req), b.customerId, b));
});
export const deletePriceRule = asyncHandler(async (req, res) => {
  await Pricing.deleteRule(req, actorOf(req), String(req.params.id));
  ok(res, { deleted: true });
});

// ── Reports ─────────────────────────────────────────────────────────────────
export const platformOverview = asyncHandler(async (_req, res) => { ok(res, await Reports.platformOverview()); });
export const resellerOverview = asyncHandler(async (req, res) => { ok(res, await Reports.resellerOverview(actorOf(req)._id)); });
