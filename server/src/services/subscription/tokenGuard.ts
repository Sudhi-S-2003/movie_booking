import type { Response } from 'express';
import mongoose from 'mongoose';
import { computeTokenCost, tokenCostForLength } from './tokenCost.js';
import { debit } from './tokenBucket.service.js';
import { getOrCreateForUser } from './subscription.service.js';
import type { SubscriptionPlan } from '../../models/subscription.model.js';

interface DebitOutcome {
  ok: true;
  cost: number;
  plan: SubscriptionPlan;
  remaining: { daily?: number; weekly?: number; monthly?: number };
}

interface GuardOpts {
  session?: mongoose.ClientSession | null | undefined;
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
  opts: GuardOpts = {},
): Promise<DebitOutcome | null> => {
  const session = opts.session ?? undefined;
  const cost = computeTokenCost(text);
  const sub  = await getOrCreateForUser(userId, { session });
  const result = await debit(userId, cost, sub.plan, { session });

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

/**
 * Length-based twin of `guardTokens` for flows where the server already has
 * an authoritative character count (longtext uploads compute it from stored
 * chunk lengths) and doesn't want to synthesize a proxy string to feed the
 * text-based helper. Behaviour, response shape, and 402 semantics match
 * `guardTokens` exactly — only the cost derivation differs.
 */
export const guardTokensForLength = async (
  userId: mongoose.Types.ObjectId | string,
  length: number,
  res: Response,
  opts: GuardOpts = {},
): Promise<DebitOutcome | null> => {
  const session = opts.session ?? undefined;
  const cost = tokenCostForLength(length);
  const sub  = await getOrCreateForUser(userId, { session });
  const result = await debit(userId, cost, sub.plan, { session });

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
