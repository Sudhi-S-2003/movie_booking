// ─────────────────────────────────────────────────────────────────────────────
// transaction.util
//
// Helpers for running multi-write paths inside a MongoDB transaction when the
// server is connected to a replica set, and falling back to a plain
// non-transactional run otherwise (single-node dev Mongos don't support them).
//
// Transaction availability is probed lazily: the first `startSession` call
// either succeeds (set cache to true) or throws a non-transient "replica set"
// error (set cache to false and never retry — retrying on every request would
// add a round-trip for zero benefit on local dev).
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';

export type TxFn<T> = (session: mongoose.ClientSession | null) => Promise<T>;

/**
 * Build a spreadable `{ session }` options bag. When `session` is nullish, the
 * result is an empty object — use it with mongoose calls so the
 * `exactOptionalPropertyTypes` TS mode doesn't complain about `undefined`.
 */
export const withSession = (
  session: mongoose.ClientSession | null | undefined,
): { session: mongoose.ClientSession } | Record<string, never> =>
  session ? { session } : {};

/** Custom error for aborting a transaction with a specific HTTP outcome. */
export class AbortTransactionError extends Error {
  public readonly status: number;
  public readonly body:   Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(`AbortTransaction(${status})`);
    this.name   = 'AbortTransactionError';
    this.status = status;
    this.body   = body;
  }
}

// Cached probe — `undefined` means "not yet probed".
let txAvailable: boolean | undefined;

// Match driver error messages for "not on a replica set" — error codes have
// drifted across mongoose major versions, so message-matching is more portable.
const isUnsupportedError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Transaction numbers are only allowed on a replica set') ||
    msg.includes('Transactions are not supported')                        ||
    msg.includes('replica set member or mongos')                          ||
    msg.includes('IllegalOperation')
  );
};

const markUnsupported = (): void => {
  if (txAvailable === undefined) {
    console.warn('[tx] transactions unavailable — falling back to non-transactional writes');
  }
  txAvailable = false;
};

const UNSUPPORTED_ERR = 'This operation requires MongoDB transactions (replica set deployment).';

/** Run `fn` inside a transaction when supported; fall back cleanly otherwise. */
export const withOptionalTransaction = async <T>(fn: TxFn<T>): Promise<T> => {
  if (txAvailable === false) return fn(null);

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    if (isUnsupportedError(err)) { markUnsupported(); return fn(null); }
    throw err;
  }

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    if (txAvailable === undefined) console.info('[tx] transactions enabled');
    txAvailable = true;
    return result;
  } catch (err) {
    if (err instanceof AbortTransactionError) {
      console.warn(`[tx] transaction aborted: ${JSON.stringify(err.body)}`);
      throw err;
    }
    if (isUnsupportedError(err)) { markUnsupported(); return fn(null); }
    throw err;
  } finally {
    if (session) await session.endSession();
  }
};

/**
 * Strict variant — throws if transactions are unsupported. Use for paths where
 * atomicity is non-negotiable (e.g. subscription activation: if bucket reset
 * fails after the plan upsert, the user has the new plan with stale quotas).
 *
 * Pro / Pro Max / Enterprise activation therefore requires a replica-set Mongo
 * deployment in production; standalone dev Mongo will fail loudly here.
 */
export const requireTransaction = async <T>(fn: TxFn<T>): Promise<T> => {
  if (txAvailable === false) throw new Error(UNSUPPORTED_ERR);

  let session: mongoose.ClientSession;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    if (isUnsupportedError(err)) { txAvailable = false; throw new Error(UNSUPPORTED_ERR); }
    throw err;
  }

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    txAvailable = true;
    return result;
  } catch (err) {
    if (isUnsupportedError(err)) { txAvailable = false; throw new Error(UNSUPPORTED_ERR); }
    if (err instanceof AbortTransactionError) {
      console.warn(`[tx] transaction aborted: ${JSON.stringify(err.body)}`);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};
