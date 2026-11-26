/**
 * Test harness: boots the Express app against a throwaway database on a
 * MongoDB replica set (transactions are required), and offers small HTTP
 * helpers. Env must be set BEFORE importing app modules, hence `setup()`.
 */
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export const SUPER_ADMIN = { email: 'owner@test.local', password: 'Owner-Pass-123!' };

export interface Harness {
  baseUrl: string;
  close: () => Promise<void>;
}

export const setup = async (): Promise<Harness> => {
  const mongoBase = process.env.TEST_MONGO_URL ?? 'mongodb://127.0.0.1:27017';
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = `${mongoBase}/test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}?directConnection=true`;
  process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef0123456789';
  process.env.SIGNING_SECRET = 'test-signing-secret-0123456789abcdef012345';
  process.env.SUPER_ADMIN_EMAIL = SUPER_ADMIN.email;
  process.env.SUPER_ADMIN_PASSWORD = SUPER_ADMIN.password;

  const mongoose = (await import('mongoose')).default;
  const { default: app } = await import('../src/app.js');
  const { syncCatalog } = await import('../src/modules/catalog/entitlement.service.js');
  const { bootstrapSuperAdmin } = await import('../src/modules/platform/superAdmin.bootstrap.js');
  const { ensureUnlimitedWallet } = await import('../src/modules/billing/billingAccount.service.js');
  const { User } = await import('../src/models/user.model.js');

  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.syncIndexes();
  await syncCatalog();
  await bootstrapSuperAdmin();
  const root = await User.findOne({ email: SUPER_ADMIN.email });
  await ensureUnlimitedWallet(root!._id);

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}/api`,
    close: async () => {
      await new Promise<void>((r) => server.close(() => r()));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
};

export interface ApiResult<T = any> {
  status: number;
  body: { success: boolean; data?: T; message?: string; code?: string; [k: string]: unknown };
}

export const api = async <T = any>(
  baseUrl: string,
  method: string,
  path: string,
  { token, body, headers = {} }: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
};

/** Mint a captcha challenge with a known answer (bypasses the image). */
export const captcha = async (answer = 'ABCD') => {
  const { createCaptchaToken } = await import('../src/utils/captcha.utils.js');
  return { captchaText: answer, captchaToken: await createCaptchaToken(answer) };
};

export const login = async (baseUrl: string, identifier: string, password: string): Promise<string> => {
  const res = await api(baseUrl, 'POST', '/auth/login', { body: { identifier, password, ...(await captcha()) } });
  if (res.status !== 200 || typeof res.body.token !== 'string') {
    throw new Error(`login failed for ${identifier}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
};
