import mongoose from 'mongoose';
import { User } from '../../models/user.model.js';
import { AuthProvider, UserRole } from '../../constants/enums.js';
import { BillingAccount, Invoice, UsageRecord } from './billing.models.js';
import { InvoiceStatus, UsageStatus } from './billing.constants.js';

const since = (days: number) => new Date(Date.now() - days * 86_400_000);
const oid = (v: unknown) => new mongoose.Types.ObjectId(String(v));

/** An account's own usage, grouped by service, over the last `days`. */
export const usageByService = async (userId: unknown, days = 30) =>
  UsageRecord.aggregate<{ _id: string; units: number; total: number; count: number }>([
    { $match: { userId: oid(userId), createdAt: { $gte: since(days) } } },
    { $group: { _id: '$serviceKey', units: { $sum: '$units' }, total: { $sum: '$total' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

export const listUsage = async (userId: unknown, page: number, limit: number, serviceKey?: string) => {
  const filter: Record<string, unknown> = { userId: oid(userId) };
  if (serviceKey) filter.serviceKey = serviceKey;
  const [items, total] = await Promise.all([
    UsageRecord.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    UsageRecord.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

/** A reseller's earnings and customer activity over the last `days`. */
export const resellerOverview = async (resellerId: unknown, days = 30) => {
  const rid = oid(resellerId);
  const [earnings, customers, revenueByService] = await Promise.all([
    UsageRecord.aggregate<{ _id: string; amount: number }>([
      { $match: { 'hops.resellerId': rid, createdAt: { $gte: since(days) } } },
      { $unwind: '$hops' },
      { $match: { 'hops.resellerId': rid } },
      { $group: { _id: '$status', amount: { $sum: '$hops.amount' } } },
    ]),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { ancestors: rid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    UsageRecord.aggregate<{ _id: string; total: number; units: number }>([
      { $match: { ancestors: rid, createdAt: { $gte: since(days) } } },
      { $group: { _id: '$serviceKey', total: { $sum: '$total' }, units: { $sum: '$units' } } },
      { $sort: { total: -1 } },
    ]),
  ]);
  const earned = Object.fromEntries(earnings.map((e) => [e._id, e.amount]));
  return {
    periodDays: days,
    earningsSettled: earned[UsageStatus.SETTLED] ?? 0,
    earningsPending: (earned[UsageStatus.UNBILLED] ?? 0) + (earned[UsageStatus.INVOICED] ?? 0),
    customersByStatus: Object.fromEntries(customers.map((c) => [c._id, c.count])),
    customerRevenueByService: revenueByService,
  };
};

/** Platform-wide overview for staff dashboards. */
export const platformOverview = async (days = 30) => {
  const [usersByRole, usage, revenueByService, outstanding, wallets, recentInvoices] = await Promise.all([
    User.aggregate<{ _id: string; count: number }>([
      { $match: { authProvider: { $ne: AuthProvider.SYSTEM } } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    UsageRecord.aggregate<{ _id: null; gross: number; platform: number; count: number }>([
      { $match: { createdAt: { $gte: since(days) }, unlimited: false } },
      { $group: { _id: null, gross: { $sum: '$total' }, platform: { $sum: '$platformAmount' }, count: { $sum: 1 } } },
    ]),
    UsageRecord.aggregate<{ _id: string; gross: number; platform: number; units: number }>([
      { $match: { createdAt: { $gte: since(days) }, unlimited: false } },
      { $group: { _id: '$serviceKey', gross: { $sum: '$total' }, platform: { $sum: '$platformAmount' }, units: { $sum: '$units' } } },
      { $sort: { gross: -1 } },
    ]),
    Invoice.aggregate<{ _id: null; total: number; count: number }>([
      { $match: { status: InvoiceStatus.ISSUED } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    BillingAccount.aggregate<{ _id: string; balance: number; unbilled: number; count: number }>([
      { $match: { isUnlimited: false } },
      { $group: { _id: '$mode', balance: { $sum: '$balance' }, unbilled: { $sum: '$unbilled' }, count: { $sum: 1 } } },
    ]),
    Invoice.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name username').lean(),
  ]);
  const roles = Object.fromEntries(usersByRole.map((r) => [r._id, r.count]));
  return {
    periodDays: days,
    users: {
      total: usersByRole.reduce((s, r) => s + r.count, 0),
      resellers: roles[UserRole.RESELLER] ?? 0,
      admins: roles[UserRole.ADMIN] ?? 0,
      users: roles[UserRole.USER] ?? 0,
    },
    usage: { gross: usage[0]?.gross ?? 0, platformRevenue: usage[0]?.platform ?? 0, charges: usage[0]?.count ?? 0 },
    revenueByService,
    outstandingInvoices: { total: outstanding[0]?.total ?? 0, count: outstanding[0]?.count ?? 0 },
    walletsByMode: wallets,
    recentInvoices,
  };
};
