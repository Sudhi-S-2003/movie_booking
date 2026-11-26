import mongoose, { type ClientSession } from 'mongoose';
import ApiError from '../services/error/ApiError.js';

const isUnsupported = (err: unknown) =>
  /replica set|Transaction numbers are only allowed|Transactions are not supported/i.test(String((err as Error)?.message));

/**
 * Run `fn` inside a MongoDB transaction (with the driver's automatic retry on
 * transient errors). Financial writes must be atomic, so there is NO
 * non-transactional fallback: on a standalone mongod this fails with 503.
 * Run MongoDB as a replica set (docker-compose does this) in every env.
 */
export const withTransaction = async <T>(fn: (session: ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (isUnsupported(err)) {
      throw new ApiError(503, 'Financial operations require MongoDB to run as a replica set', 'TRANSACTIONS_UNAVAILABLE');
    }
    throw err;
  } finally {
    await session.endSession();
  }
};
