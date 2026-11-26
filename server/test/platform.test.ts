/**
 * End-to-end tests for the platform core: auth hardening, protected super
 * admin, role/subtree scoping, service entitlements, pricing hierarchy,
 * prepaid/postpaid billing, wallet transfers and signed-link scopes.
 *
 * Runs against a real MongoDB replica set (see `npm run test` / README).
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, api, captcha, login, SUPER_ADMIN, type Harness } from './helpers.js';

let h: Harness;
let rootToken: string;
const M = 1_000_000; // micros per rupee

before(async () => {
  process.env.DISABLE_RATE_LIMIT = '1';
  h = await setup();
  rootToken = await login(h.baseUrl, SUPER_ADMIN.email, SUPER_ADMIN.password);
});
after(async () => { await h.close(); });

const register = async (username: string, extra: Record<string, unknown> = {}) =>
  api(h.baseUrl, 'POST', '/auth/register', {
    body: { name: username, username, email: `${username}@test.local`, password: 'Passw0rd!x', ...(await captcha()), ...extra },
  });

const createAs = async (token: string, username: string, role: 'user' | 'reseller' = 'user', extra: Record<string, unknown> = {}) => {
  const res = await api(h.baseUrl, 'POST', '/manage/users', {
    token, body: { name: username, username, email: `${username}@test.local`, password: 'Passw0rd!x', role, ...extra },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { id: res.body.data.id as string, token: await login(h.baseUrl, username, 'Passw0rd!x') };
};

describe('authentication', () => {
  test('self-registration ignores a supplied role', async () => {
    const res = await register('mallory', { role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'user');
  });

  test('captcha challenges are single-use', async () => {
    const c = await captcha('WXYZ');
    const first = await api(h.baseUrl, 'POST', '/auth/login', { body: { identifier: 'mallory', password: 'wrong-pass-1', ...c } });
    assert.equal(first.status, 401); // captcha accepted, password wrong
    const replay = await api(h.baseUrl, 'POST', '/auth/login', { body: { identifier: 'mallory', password: 'Passw0rd!x', ...c } });
    assert.equal(replay.status, 400); // same challenge rejected
  });

  test('weak passwords are rejected', async () => {
    const res = await register('weakling', { password: 'short' });
    assert.equal(res.status, 400);
  });
});

describe('protected super admin', () => {
  test('cannot be modified through the management API', async () => {
    const admin = await createAs(rootToken, 'staffer');
    const promote = await api(h.baseUrl, 'POST', `/manage/users/${admin.id}/role`, { token: rootToken, body: { role: 'admin' } });
    assert.equal(promote.status, 200);
    const adminToken = await login(h.baseUrl, 'staffer', 'Passw0rd!x');

    const me = await api(h.baseUrl, 'GET', '/account/me', { token: rootToken });
    const rootId = me.body.data.id;
    for (const [method, path, body] of [
      ['POST', `/manage/users/${rootId}/suspend`, { reason: 'takeover attempt' }],
      ['POST', `/manage/users/${rootId}/role`, { role: 'user' }],
      ['PATCH', `/manage/users/${rootId}`, { name: 'pwned' }],
      ['POST', `/manage/users/${rootId}/close`, { reason: 'takeover attempt' }],
    ] as const) {
      const res = await api(h.baseUrl, method, path, { token: adminToken, body });
      assert.equal(res.status, 403, `${method} ${path} should be refused`);
    }
  });

  test('data layer refuses protected writes outside the system context', async () => {
    const { User } = await import('../src/models/user.model.js');
    const root = await User.findOne({ email: SUPER_ADMIN.email });
    root!.role = 'user';
    await assert.rejects(root!.save(), /protected/i);
    const res = await User.updateOne({ _id: root!._id }, { $set: { status: 'suspended' } });
    assert.equal(res.modifiedCount, 0);
    const del = await User.deleteOne({ _id: root!._id });
    assert.equal(del.deletedCount, 0);
    await assert.rejects(User.create({ name: 'x', username: 'fakeroot', email: 'f@t.l', password: 'x', role: 'super_admin' }), /bootstrap/i);
  });

  test('wallet is unlimited and cannot be unset or granted via API', async () => {
    const summary = await api(h.baseUrl, 'GET', '/billing/summary', { token: rootToken });
    assert.equal(summary.body.data.account.isUnlimited, true);
    const { BillingAccount } = await import('../src/modules/billing/billing.models.js');
    await assert.rejects(BillingAccount.updateMany({}, { $set: { isUnlimited: true } }), /system/i);
  });
});

describe('reseller hierarchy and entitlements', () => {
  test('resellers manage only their own subtree; admins cannot manage staff', async () => {
    const r1 = await createAs(rootToken, 'reseller_one', 'reseller');
    const r2 = await createAs(rootToken, 'reseller_two', 'reseller');
    const c1 = await createAs(r1.token, 'cust_of_one');

    const peek = await api(h.baseUrl, 'GET', `/manage/users/${c1.id}`, { token: r2.token });
    assert.equal(peek.status, 404);
    const list = await api(h.baseUrl, 'GET', '/manage/users', { token: r1.token });
    assert.deepEqual(list.body.data.items.map((u: { username: string }) => u.username), ['cust_of_one']);

    const staffToken = await login(h.baseUrl, 'staffer', 'Passw0rd!x');
    const me = await api(h.baseUrl, 'GET', '/account/me', { token: staffToken });
    const other = await createAs(rootToken, 'staffer_two');
    await api(h.baseUrl, 'POST', `/manage/users/${other.id}/role`, { token: rootToken, body: { role: 'admin' } });
    const res = await api(h.baseUrl, 'POST', `/manage/users/${other.id}/suspend`, { token: staffToken, body: { reason: 'peer suspend' } });
    assert.equal(res.status, 404);
    assert.ok(me.body.data.id);
  });

  test('revoking a service from a reseller cuts off its customers', async () => {
    const r1Token = await login(h.baseUrl, 'reseller_one', 'Passw0rd!x');
    const list = await api(h.baseUrl, 'GET', '/manage/users?q=reseller_one', { token: rootToken });
    const r1Id = list.body.data.items[0].id;

    // Reseller is platform-direct, so self-serve chat is implied; staff revokes it.
    const revoke = await api(h.baseUrl, 'PUT', `/services/users/${r1Id}/chat`, { token: rootToken, body: { allowed: false } });
    assert.equal(revoke.status, 200);

    const custToken = await login(h.baseUrl, 'cust_of_one', 'Passw0rd!x');
    const services = await api(h.baseUrl, 'GET', '/services', { token: custToken });
    const chat = services.body.data.find((s: { key: string }) => s.key === 'chat');
    assert.equal(chat.usable, false);
    const blocked = await api(h.baseUrl, 'GET', '/chat/conversations', { token: custToken });
    assert.equal(blocked.status, 403);

    await api(h.baseUrl, 'PUT', `/services/users/${r1Id}/chat`, { token: rootToken, body: { allowed: true } });
    const ok = await api(h.baseUrl, 'GET', '/chat/conversations', { token: custToken });
    assert.equal(ok.status, 200);
    assert.ok(r1Token);
  });
});

describe('pricing and billing', () => {
  const setup = async () => {
    const { Service } = await import('../src/modules/catalog/catalog.models.js');
    const { invalidateCatalogCache } = await import('../src/modules/catalog/entitlement.service.js');
    await Service.updateOne({ key: 'url-preview' }, { $set: { basePrice: 1000 } }); // ₹0.001/unit
    invalidateCatalogCache();
    const r = await createAs(rootToken, 'price_reseller', 'reseller');
    const c = await createAs(r.token, 'price_customer');
    // Staff: reseller pays base + 10%. Reseller: customer pays reseller price + 50 micros.
    assert.equal((await api(h.baseUrl, 'PUT', `/billing/pricing/resellers/${r.id}`, { token: rootToken, body: { serviceKey: 'url-preview', type: 'percent', value: 1000 } })).status, 200);
    assert.equal((await api(h.baseUrl, 'PUT', '/billing/pricing/customers', { token: r.token, body: { serviceKey: '*', type: 'fixed', value: 50, customerId: null } })).status, 200);
    return { r, c };
  };

  test('price hierarchy, prepaid debit, reseller earnings, idempotency, insufficient funds', async () => {
    const { r, c } = await setup();
    const quote = await api(h.baseUrl, 'GET', '/billing/quote?serviceKey=url-preview&units=10', { token: c.token });
    assert.equal(quote.body.data.unitPrice, 1150); // 1000 + 10% + 50

    const { chargeUsage } = await import('../src/modules/billing/charge.service.js');
    const { User } = await import('../src/models/user.model.js');
    const customer = (await User.findById(c.id))!;

    await assert.rejects(chargeUsage({ user: customer, serviceKey: 'url-preview', units: 10, description: 't' }), /Insufficient/);

    // Reseller funds its customer (reseller itself funded by the platform).
    assert.equal((await api(h.baseUrl, 'POST', '/billing/topups', { token: rootToken, body: { userId: r.id, amount: 5 * M, reference: 'BANK-1' } })).status, 201);
    assert.equal((await api(h.baseUrl, 'POST', '/billing/transfers', { token: r.token, body: { toUserId: c.id, amount: 1 * M } })).status, 201);

    const first = await chargeUsage({ user: customer, serviceKey: 'url-preview', units: 10, idempotencyKey: 'test:charge:1', description: 't' });
    const again = await chargeUsage({ user: customer, serviceKey: 'url-preview', units: 10, idempotencyKey: 'test:charge:1', description: 't' });
    assert.equal(first.usage.total, 11_500);
    assert.equal(first.usage.platformAmount, 11_000);
    assert.equal(again.duplicate, true);

    const cust = await api(h.baseUrl, 'GET', '/billing/summary', { token: c.token });
    assert.equal(cust.body.data.account.balance, 1 * M - 11_500);
    const resl = await api(h.baseUrl, 'GET', '/billing/summary', { token: r.token });
    assert.equal(resl.body.data.account.balance, 4 * M + 500); // 5M - 1M transfer + 50×10 markup
    assert.equal(resl.body.data.account.lifetimeEarnings, 500);
  });

  test('postpaid: credit limit, invoice, wallet payment settles reseller earnings', async () => {
    const { User } = await import('../src/models/user.model.js');
    const { chargeUsage } = await import('../src/modules/billing/charge.service.js');
    const r = await api(h.baseUrl, 'GET', '/manage/users?q=price_reseller', { token: rootToken });
    const rToken = await login(h.baseUrl, 'price_reseller', 'Passw0rd!x');
    const pc = await createAs(rToken, 'postpaid_customer');
    const cfg = await api(h.baseUrl, 'PATCH', `/billing/users/${pc.id}/config`, { token: rToken, body: { mode: 'postpaid', creditLimit: 20_000 } });
    assert.equal(cfg.status, 200, JSON.stringify(cfg.body));

    const customer = (await User.findById(pc.id))!;
    await chargeUsage({ user: customer, serviceKey: 'url-preview', units: 10, description: 'p1' }); // 11,500
    await assert.rejects(chargeUsage({ user: customer, serviceKey: 'url-preview', units: 10, description: 'p2' }), /credit limit/);

    const before = await api(h.baseUrl, 'GET', '/billing/summary', { token: rToken });
    assert.equal(before.body.data.account.pendingEarnings, 500);

    const close = await api(h.baseUrl, 'POST', `/billing/users/${pc.id}/close-cycle`, { token: rToken });
    assert.equal(close.status, 200);
    assert.equal(close.body.data.total, 11_500);

    // Customer pays from its wallet (funded by the reseller).
    await api(h.baseUrl, 'POST', '/billing/transfers', { token: rToken, body: { toUserId: pc.id, amount: 20_000 } });
    const pay = await api(h.baseUrl, 'POST', `/billing/invoices/${close.body.data._id}/pay`, { token: pc.token, body: { method: 'wallet' } });
    assert.equal(pay.status, 200, JSON.stringify(pay.body));

    const after = await api(h.baseUrl, 'GET', '/billing/summary', { token: rToken });
    assert.equal(after.body.data.account.pendingEarnings, 0);
    assert.equal(after.body.data.account.lifetimeEarnings, 1000);
    const custAfter = await api(h.baseUrl, 'GET', '/billing/summary', { token: pc.token });
    assert.equal(custAfter.body.data.account.outstanding, 0);
    assert.equal(custAfter.body.data.account.balance, 20_000 - 11_500);
    assert.ok(r.body.data.items.length);
  });

  test('transfers only reach managed accounts; super admin usage is free of balance changes', async () => {
    const rToken = await login(h.baseUrl, 'price_reseller', 'Passw0rd!x');
    const other = await api(h.baseUrl, 'GET', '/manage/users?q=cust_of_one', { token: rootToken });
    const res = await api(h.baseUrl, 'POST', '/billing/transfers', { token: rToken, body: { toUserId: other.body.data.items[0].id, amount: 100 } });
    assert.equal(res.status, 404);

    const { chargeUsage } = await import('../src/modules/billing/charge.service.js');
    const { User } = await import('../src/models/user.model.js');
    const root = (await User.findOne({ email: SUPER_ADMIN.email }))!;
    const r = await chargeUsage({ user: root, serviceKey: 'url-preview', units: 1000, description: 'owner usage' });
    assert.equal(r.usage.unlimited, true);
    assert.equal(r.usage.walletDebited, 0);
  });
});

describe('signed links', () => {
  test('read-scoped links cannot perform write actions', async () => {
    const { generateSignedUrlData } = await import('../src/utils/apiService.util.js');
    const { CodeShare } = await import('../src/models/codeShare.model.js');
    const { User } = await import('../src/models/user.model.js');
    const owner = (await User.findOne({ username: 'mallory' }))!;
    const doc = await CodeShare.create({ createdBy: owner._id, title: 'snippet', totalLength: 0 });
    const read = generateSignedUrlData(String(doc._id), 'code-share', 5, 'read');
    const qs = `signature=${read.signature}&expiresAt=${read.expiresAt}&scope=read`;
    const view = await api(h.baseUrl, 'GET', `/public/api-service/code-share/${doc._id}?${qs}&action=read`);
    assert.equal(view.status, 200);
    const del = await api(h.baseUrl, 'POST', `/public/api-service/code-share/${doc._id}?${qs}`, { body: { action: 'delete' } });
    assert.equal(del.status, 403);
    const upgraded = await api(h.baseUrl, 'POST', `/public/api-service/code-share/${doc._id}?signature=${read.signature}&expiresAt=${read.expiresAt}&scope=write`, { body: { action: 'delete' } });
    assert.equal(upgraded.status, 401);
  });
});
