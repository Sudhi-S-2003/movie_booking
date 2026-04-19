import type { Response } from 'express';
import mongoose from 'mongoose';
import { computeTokenCost } from './tokenCost.js';
import { debit } from './tokenBucket.service.js';
import { getOrCreateForUser } from './subscription.service.js';
import type { SubscriptionPlan } from '../../models/subscription.model.js';

export interface DebitOutcome {
  ok: true;
  cost: number;
  plan: SubscriptionPlan;
  remaining: { daily?: number; weekly?: number; monthly?: number };
}

/**
 * Debit token cost from `userId`. Writes a 402 to `res` and returns `null`
 * when the limit is reached; callers should bail out immediately in that case.
 *
 * The response body for the originating message already carries the fresh
 * `tokens.remaining` bundle, so no socket emit is needed here — the client
 * updates its header pill directly from the API response.
 */
export const guardTokens = async (
  userId: mongoose.Types.ObjectId | string,
  text: string,
  res: Response,
): Promise<DebitOutcome | null> => {
  const cost = computeTokenCost(text);
  const sub  = await getOrCreateForUser(userId);
  const result = await debit(userId, cost, sub.plan);

  const remainingPayload: { daily?: number; weekly?: number; monthly?: number } = {};
  if (result.remaining.daily   !== undefined) remainingPayload.daily   = result.remaining.daily;
  if (result.remaining.weekly  !== undefined) remainingPayload.weekly  = result.remaining.weekly;
  if (result.remaining.monthly !== undefined) remainingPayload.monthly = result.remaining.monthly;

  if (!result.ok) {
    res.status(402).json({
      success: false,
      message: 'Token limit reached',
      plan:     sub.plan,
      remaining: remainingPayload,
      blockedBy: result.blockedBy,
    });
    return null;
  }

  return {
    ok:   true,
    cost,
    plan: sub.plan,
    remaining: remainingPayload,
  };
};
