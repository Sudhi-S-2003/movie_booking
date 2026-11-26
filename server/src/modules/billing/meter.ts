import type { Response } from 'express';
import ApiError from '../../services/error/ApiError.js';
import { chargeUsage, type ChargeRequest, type ChargeResult } from './charge.service.js';
import { BillingAccount } from './billing.models.js';

/** Billable units for text-based services: 1 token ≈ 4 characters, minimum 1. */
export const tokensForLength = (length: number): number =>
  Math.max(1, Math.ceil((Number.isFinite(length) && length > 0 ? Math.floor(length) : 0) / 4));

export const tokensForText = (text: string): number => tokensForLength(typeof text === 'string' ? text.length : 0);

export interface MeterOutcome {
  cost: number;
  units: number;
  usageId: string;
  /** Remaining prepaid balance (null for postpaid/unlimited). */
  balance: number | null;
}

const toOutcome = async (result: ChargeResult): Promise<MeterOutcome> => {
  const account = await BillingAccount.findOne({ userId: result.usage.userId }).select('balance mode isUnlimited').lean();
  return {
    cost: result.usage.total,
    units: result.usage.units,
    usageId: String(result.usage._id),
    balance: account && account.mode === 'prepaid' && !account.isUnlimited ? account.balance : null,
  };
};

/**
 * Charge for a request inside an HTTP handler. On insufficient funds / no
 * access it writes the 402/403 response and returns null — callers must
 * stop processing. Any other error propagates.
 */
export const meterOrReject = async (res: Response, req: ChargeRequest): Promise<MeterOutcome | null> => {
  try {
    return await toOutcome(await chargeUsage(req));
  } catch (err) {
    if (err instanceof ApiError && (err.statusCode === 402 || err.statusCode === 403)) {
      if (!res.headersSent) res.status(err.statusCode).json({ success: false, code: err.code, message: err.message, details: err.details });
      return null;
    }
    throw err;
  }
};

/** Same as `meterOrReject`, loading the billed account by id (e.g. a guest chat's owner). */
export const meterUserById = async (
  res: Response,
  userId: string,
  req: Omit<ChargeRequest, 'user'>,
): Promise<MeterOutcome | null> => {
  const { User } = await import('../../models/user.model.js');
  const user = await User.findById(userId).session(req.session ?? null);
  if (!user) {
    if (!res.headersSent) res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Billing account owner not found' });
    return null;
  }
  return meterOrReject(res, { ...req, user });
};
