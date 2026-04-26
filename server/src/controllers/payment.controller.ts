import type { Response } from 'express';
import crypto from 'crypto';
import { SeatReservation } from '../models/seatReservation.model.js';
import { SeatStatus } from '../constants/enums.js';
import { getIO } from '../socket/index.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { activatePaidPlan } from '../services/subscription/subscription.service.js';
import type { BillingCycle } from '../models/subscription.model.js';
import type { PaidPlanKey } from '../services/subscription/subscriptionPlans.js';
import { notificationService } from '../services/notification.service.js';

export type PaymentKind = 'seat' | 'subscription';

export interface PaymentIntent {
  paymentIntentId: string;
  clientSecret:    string;
  amount:          number;
  currency:        string;
  status:          'requires_payment' | 'processing' | 'succeeded' | 'failed';
  kind:            PaymentKind;
  userId:          string;
  transactionId?:  string;
  createdAt:       Date;
  // Seat-specific
  reservationIds?: string[];
  // Arbitrary per-kind payload (e.g. subscription cycle)
  metadata?:       Record<string, unknown>;
}

// In-memory store for dummy payment intents
const paymentIntents = new Map<string, PaymentIntent>();

/** Internal accessor used by other controllers (e.g. subscription). */
export const paymentIntentsStore = {
  get: (id: string) => paymentIntents.get(id),
  set: (id: string, intent: PaymentIntent) => paymentIntents.set(id, intent),
};

const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(16).toString('hex')}`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a new dummy payment intent.
 *
 * Body:
 *   - `kind` (optional, default `seat`): `seat` | `subscription`
 *   - Seat kind requires `reservationIds: string[]` and verifies ownership.
 *   - Subscription kind accepts `metadata: Record<string, unknown>` only; the
 *     caller (subscription controller) is responsible for supplying amount.
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency, reservationIds, kind: kindRaw, metadata } = req.body;
    const kind: PaymentKind = kindRaw === 'subscription' ? 'subscription' : 'seat';
    const userId = req.user!.id;

    if (!amount || !currency) {
      return res.status(400).json({ success: false, message: 'amount and currency are required' });
    }

    if (kind === 'seat') {
      if (!reservationIds || !Array.isArray(reservationIds)) {
        return res.status(400).json({ success: false, message: 'reservationIds are required' });
      }
      const reservations = await SeatReservation.find({
        _id: { $in: reservationIds },
        userId,
        status: SeatStatus.LOCKED,
      });
      if (reservations.length !== reservationIds.length) {
        return res.status(400).json({ success: false, message: 'Some reservations are invalid, expired, or not owned by you' });
      }
    }

    const paymentIntentId = generateId('pi');
    const clientSecret    = generateId('secret');

    const intent: PaymentIntent = {
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status:    'requires_payment',
      kind,
      userId,
      createdAt: new Date(),
      ...(kind === 'seat' ? { reservationIds: reservationIds as string[] } : {}),
      ...(metadata && typeof metadata === 'object' ? { metadata: metadata as Record<string, unknown> } : {}),
    };

    paymentIntents.set(paymentIntentId, intent);

    res.status(201).json({
      success: true,
      clientSecret,
      paymentIntentId,
      amount,
      currency,
      status: 'requires_payment',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId, paymentMethod } = req.body;

    if (!paymentIntentId || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'paymentIntentId and paymentMethod are required' });
    }

    const intent = paymentIntents.get(paymentIntentId);
    if (!intent) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }

    if (intent.userId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to confirm this payment' });
    }

    if (intent.status === 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment already confirmed' });
    }

    intent.status = 'processing';
    await delay(1500);
    const transactionId = generateId('txn');

    if (intent.kind === 'seat') {
      const reservationIds = intent.reservationIds ?? [];
      const reservations = await SeatReservation.updateMany(
        {
          _id:    { $in: reservationIds },
          userId: req.user!.id,
          status: SeatStatus.LOCKED,
        },
        {
          status: SeatStatus.BOOKED,
          transactionId,
          $unset: { expiresAt: 1 },
        },
      );

      if (reservations.modifiedCount === 0) {
        intent.status = 'failed';
        return res.status(400).json({ success: false, message: 'No valid locked seats found. They may have expired.' });
      }

      intent.status = 'succeeded';
      intent.transactionId = transactionId;
      getIO().emit('seats_booked', { reservationIds, transactionId });

      // Notify authenticated user
      notificationService.sendNotification({
        userIds: [intent.userId],
        title: 'Booking Confirmed! 🎫',
        message: `Your booking for ${reservationIds.length} seat(s) was successful. Transaction: ${transactionId}`,
        url: '/profile/bookings' // Link to user's bookings
      });

      // Notify admins
      notificationService.sendNotification({
        targets: ['admins'],
        title: 'New Movie Booking!',
        message: `User ${req.user!.name} just confirmed a booking for ${reservationIds.length} seat(s).`,
        url: '/admin/overview' // Link to admin dashboard
      });
    } else {
      // Subscription path — metadata.plan + cycle/custom fields drive activation.
      const meta = intent.metadata ?? {};
      const planKey = (meta['plan'] as PaidPlanKey | 'enterprise' | undefined) ?? 'pro';

      if (planKey === 'enterprise') {
        const customMonthlyLimit   = meta['customMonthlyLimit']   as number | undefined;
        const customDurationMonths = meta['customDurationMonths'] as number | undefined;
        try {
          await activatePaidPlan(intent.userId, {
            plan: 'enterprise',
            paymentId: paymentIntentId,
            ...(customMonthlyLimit   !== undefined ? { customMonthlyLimit }   : {}),
            ...(customDurationMonths !== undefined ? { customDurationMonths } : {}),
          });
        } catch (err: unknown) {
          intent.status = 'failed';
          return res.status(400).json({ success: false, message: getErrorMessage(err) });
        }
      } else if (planKey === 'pro' || planKey === 'proMax') {
        const cycle = (meta['cycle'] as BillingCycle | undefined) ?? 'monthly';
        if (cycle !== 'monthly' && cycle !== 'quarterly') {
          intent.status = 'failed';
          return res.status(400).json({ success: false, message: 'Invalid subscription cycle' });
        }
        await activatePaidPlan(intent.userId, {
          plan: planKey,
          cycle,
          paymentId: paymentIntentId,
        });
      } else {
        intent.status = 'failed';
        return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
      }

      intent.status = 'succeeded';
      intent.transactionId = transactionId;

      // Notify user about subscription
      notificationService.sendNotification({
        userIds: [intent.userId],
        title: 'Subscription Activated! 🚀',
        message: `You have successfully upgraded to the ${planKey.toUpperCase()} plan. Enjoy your premium benefits!`,
        url: '/profile/subscription'
      });

      // Platform notification for new subscription
      notificationService.sendNotification({
        targets: ['admins'],
        title: 'New Subscription!',
        message: `User ${req.user!.name} upgraded to ${planKey.toUpperCase()} plan.`,
        url: '/admin/users' // Link to user management
      });
    }

    res.status(200).json({
      success: true,
      status:  'succeeded',
      transactionId,
      kind:    intent.kind,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const intent = paymentIntents.get(id);

    if (!intent) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }

    if (intent.userId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this payment' });
    }

    res.status(200).json({
      success: true,
      paymentIntentId: intent.paymentIntentId,
      amount:          intent.amount,
      currency:        intent.currency,
      status:          intent.status,
      kind:            intent.kind,
      transactionId:   intent.transactionId || null,
      createdAt:       intent.createdAt,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
