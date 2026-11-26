import type { Response } from 'express';
import crypto from 'crypto';
import { SeatReservation } from '../models/seatReservation.model.js';
import { PaymentTransaction } from '../models/paymentTransaction.model.js';
import { SeatStatus } from '../constants/enums.js';
import { getIO } from '../socket/index.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { notificationService } from '../services/notification.service.js';
import { meterOrReject } from '../modules/billing/meter.js';
import { SERVICE_KEYS } from '../modules/catalog/catalog.registry.js';

/**
 * Movie service — ticket checkout.
 *
 * IMPORTANT: there is no real payment gateway integrated. Ticket payment
 * intents are simulated (in-memory) exactly as before this refactor, so a
 * "confirmed" ticket does not mean money was collected. Integrate a gateway
 * (and verify its webhook) before taking real payments. What IS real:
 *   - the ticket amount is computed server-side from locked reservations,
 *   - the platform's movie-service fee is charged through the billing engine.
 */
interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment' | 'processing' | 'succeeded' | 'failed';
  userId: string;
  reservationIds: string[];
  transactionId?: string;
  createdAt: Date;
}

const paymentIntents = new Map<string, PaymentIntent>();
const INTENT_TTL_MS = 30 * 60 * 1000;
const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(16).toString('hex')}`;

const pruneIntents = () => {
  const cutoff = Date.now() - INTENT_TTL_MS;
  for (const [id, intent] of paymentIntents) if (intent.createdAt.getTime() < cutoff) paymentIntents.delete(id);
};

/** POST /api/payment/create-intent — body: { reservationIds: string[] } */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    pruneIntents();
    const { reservationIds } = req.body ?? {};
    const userId = req.user!.id;
    if (!Array.isArray(reservationIds) || reservationIds.length === 0 || reservationIds.length > 20) {
      return res.status(400).json({ success: false, message: 'reservationIds are required' });
    }
    const reservations = await SeatReservation.find({ _id: { $in: reservationIds }, userId, status: SeatStatus.LOCKED });
    if (reservations.length !== reservationIds.length) {
      return res.status(400).json({ success: false, message: 'Some reservations are invalid, expired, or not owned by you' });
    }
    const amount = reservations.reduce((sum, r) => sum + r.price, 0);
    const intent: PaymentIntent = {
      paymentIntentId: generateId('pi'),
      clientSecret: generateId('secret'),
      amount,
      currency: 'INR',
      status: 'requires_payment',
      userId,
      reservationIds: reservations.map((r) => String(r._id)),
      createdAt: new Date(),
    };
    paymentIntents.set(intent.paymentIntentId, intent);
    res.status(201).json({
      success: true,
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      amount,
      currency: intent.currency,
      status: intent.status,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/** POST /api/payment/confirm — body: { paymentIntentId, paymentMethod } */
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId, paymentMethod } = req.body ?? {};
    if (!paymentIntentId || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'paymentIntentId and paymentMethod are required' });
    }
    const intent = paymentIntents.get(String(paymentIntentId));
    if (!intent || intent.userId !== req.user!.id) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }
    if (intent.status === 'succeeded' || intent.status === 'processing') {
      return res.status(409).json({ success: false, message: 'Payment already being processed or confirmed' });
    }
    intent.status = 'processing';

    // Platform fee for the movie service (1 unit per booking), charged
    // before the seats are confirmed. Idempotent per payment intent.
    const fee = await meterOrReject(res, {
      user: req.user!,
      serviceKey: SERVICE_KEYS.MOVIES,
      units: 1,
      idempotencyKey: `movies:booking:${intent.paymentIntentId}`,
      description: `Movie booking (${intent.reservationIds.length} seats)`,
    });
    if (!fee) {
      intent.status = 'requires_payment';
      return;
    }

    const transactionId = generateId('txn');
    const updated = await SeatReservation.updateMany(
      { _id: { $in: intent.reservationIds }, userId: req.user!.id, status: SeatStatus.LOCKED },
      { status: SeatStatus.BOOKED, transactionId, $unset: { expiresAt: 1 } },
    );
    if (updated.modifiedCount === 0) {
      intent.status = 'failed';
      return res.status(400).json({ success: false, message: 'No valid locked seats found. They may have expired.' });
    }

    intent.status = 'succeeded';
    intent.transactionId = transactionId;
    getIO().emit('seats_booked', { reservationIds: intent.reservationIds, transactionId });

    await PaymentTransaction.create({
      userId: intent.userId,
      paymentIntentId: intent.paymentIntentId,
      transactionId,
      amount: intent.amount,
      currency: intent.currency,
      kind: 'seat',
      description: `Movie Ticket Booking (${intent.reservationIds.length} seats)`,
      status: 'succeeded',
    });

    notificationService.sendNotification({
      userIds: [intent.userId],
      title: 'Booking Confirmed',
      message: `Your booking for ${intent.reservationIds.length} seat(s) was successful. Transaction: ${transactionId}`,
      url: '/dashboard/bookings',
    });

    res.status(200).json({ success: true, status: 'succeeded', transactionId, kind: 'seat' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const intent = paymentIntents.get(String(req.params.id));
    if (!intent || intent.userId !== req.user!.id) {
      return res.status(404).json({ success: false, message: 'Payment intent not found' });
    }
    res.status(200).json({
      success: true,
      paymentIntentId: intent.paymentIntentId,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      kind: 'seat',
      transactionId: intent.transactionId || null,
      createdAt: intent.createdAt,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
