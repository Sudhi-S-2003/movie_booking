import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { AuthProvider, UserRole, UserStatus } from '../../constants/enums.js';
import { syncCatalog, grantInitialServices } from '../../modules/catalog/entitlement.service.js';
import { bootstrapSuperAdmin } from '../../modules/platform/superAdmin.bootstrap.js';
import { ensureBillingAccount, ensureUnlimitedWallet } from '../../modules/billing/billingAccount.service.js';
import { BillingAccount, PriceRule, LedgerEntry } from '../../modules/billing/billing.models.js';
import { BillingMode, LedgerKind, MICROS_PER_UNIT, PriceRuleScope } from '../../modules/billing/billing.constants.js';
import type { UserDoc } from './users.js';
import { log } from './helpers.js';

const M = MICROS_PER_UNIT;

/** Credit a wallet with a matching ledger entry (seed-time, no transaction needed). */
const credit = async (userId: mongoose.Types.ObjectId, amount: number, description: string) => {
  const acc = await BillingAccount.findOneAndUpdate({ userId }, { $inc: { balance: amount } }, { returnDocument: 'after' });
  await LedgerEntry.create({ userId, direction: 'credit', kind: LedgerKind.TOPUP, amount, balanceAfter: acc?.balance ?? amount, description });
};

/**
 * Platform layer on top of the demo data:
 *  - catalog + protected super admin (from SUPER_ADMIN_EMAIL/PASSWORD)
 *  - a demo reseller owning three of the demo users, one of them postpaid
 *  - wallets for everyone, with starting credit
 *  - example reseller + customer markups
 */
export const seedPlatform = async (users: UserDoc[], password: string) => {
  log('🏗️', 'Seeding platform: catalog, super admin, reseller, wallets, pricing...');
  await syncCatalog();
  await bootstrapSuperAdmin();
  const root = await User.findOne({ role: UserRole.SUPER_ADMIN, isProtected: true });
  if (root) await ensureUnlimitedWallet(root._id);

  const reseller = await User.create({
    name: 'Demo Reseller', username: 'demo_reseller', email: 'reseller@demo.test',
    password: await bcrypt.hash(password, 12), role: UserRole.RESELLER, status: UserStatus.ACTIVE,
    resellerCode: 'demo', brandName: 'Demo Telecom', authProvider: AuthProvider.LOCAL,
  });

  // Move three regular demo users under the reseller.
  const customers = users.filter((u) => u.role === UserRole.USER && !u.permissions?.length).slice(0, 3);
  for (const c of customers) {
    await User.updateOne({ _id: c._id }, { $set: { parentId: reseller._id, ancestors: [reseller._id] } });
  }

  const all = await User.find({ authProvider: { $ne: AuthProvider.SYSTEM } });
  for (const u of all) await ensureBillingAccount(u);

  const resellerDoc = (await User.findById(reseller._id))!;
  for (const c of customers) {
    const doc = await User.findById(c._id);
    if (doc) await grantInitialServices(doc, resellerDoc);
  }

  // Starting credit: platform-direct users ₹500, reseller ₹5,000, its prepaid customers ₹200.
  for (const u of all) {
    if (u.role === UserRole.SUPER_ADMIN) continue;
    const underReseller = customers.some((c) => String(c._id) === String(u._id));
    if (!underReseller) await credit(u._id, 500 * M, 'Seed: welcome credit');
  }
  await credit(reseller._id, 5000 * M, 'Seed: reseller opening balance');
  for (const c of customers.slice(0, 2)) await credit(c._id, 200 * M, 'Seed: credit from Demo Reseller');

  // Third customer is postpaid with a ₹1,000 credit limit.
  if (customers[2]) {
    await BillingAccount.updateOne({ userId: customers[2]._id }, { $set: { mode: BillingMode.POSTPAID, creditLimit: 1000 * M, cycleStart: new Date() } });
  }

  if (root) {
    await PriceRule.create([
      { scope: PriceRuleScope.RESELLER, resellerId: reseller._id, customerId: null, serviceKey: '*', type: 'percent', value: 1000, setBy: root._id },
      { scope: PriceRuleScope.CUSTOMER, resellerId: reseller._id, customerId: null, serviceKey: '*', type: 'percent', value: 2500, setBy: reseller._id },
    ]);
  }

  log('✅', `Platform seeded: reseller "demo_reseller" with ${customers.length} customers (${customers.map((c) => c.username).join(', ')})`);
  return { reseller, customers };
};
