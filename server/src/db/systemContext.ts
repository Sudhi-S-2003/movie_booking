import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Privileged execution context for the data layer.
 *
 * Model hooks (see user.model / wallet model) refuse to modify protected
 * records unless the write runs inside `runAsSystem`. Only trusted
 * server-side code (the super-admin bootstrap and migrations) calls it —
 * never request handlers — so no API path can reach protected data even if
 * a service-level check is missed.
 */
interface SystemContext {
  allowProtected: true;
  reason: string;
}

const storage = new AsyncLocalStorage<SystemContext>();

export const runAsSystem = <T>(reason: string, fn: () => Promise<T>): Promise<T> =>
  storage.run({ allowProtected: true, reason }, fn);

export const isSystemContext = (): boolean => storage.getStore()?.allowProtected === true;

export class ProtectedRecordError extends Error {
  readonly statusCode = 403;
  readonly code = 'PROTECTED_ACCOUNT';
  constructor(message = 'This account is protected and cannot be modified') {
    super(message);
    this.name = 'ProtectedRecordError';
  }
}
