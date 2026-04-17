import type { Request, Response } from 'express';
import crypto from 'crypto';
import { SeatReservation } from '../models/seatReservation.model.js';
import { SeatStatus } from '../constants/enums.js';
import { getIO } from '../socket/index.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';

interface PaymentIntent {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment' | 'processing' | 'succeeded' | 'failed';
  reservationIds: string[];
  userId: string;
  transactionId?: string;
  createdAt: Date;
}

// In-memory store for dummy payment intents
const paymentIntents = new Map<string, PaymentIntent>();

const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(16).toString('hex')}`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency, reservationIds } = req.body;
    const userId = req.user!.id;

    if (!amount || !currency || !reservationIds || !Array.isArray(reservationIds)) {
      return res.status(400).json({ success: false, message: 'amount, currency, and reservationIds are required' });
    }

    // Verify that the reservations belong to this user and are in LOCKED status
    const reservations = await SeatReservation.find({
      _id: { $in: reservationIds },
      userId,
      status: SeatStatus.LOCKED
    });

    if (reservations.length !== reservationIds.length) {
      return res.status(400).json({ success: false, message: 'Some reservations are invalid, expired, or not owned by you' });
    }

    const paymentIntentId = generateId('pi');
    const clientSecret = generateId('secret');

    const intent: PaymentIntent = {
      paymentIntentId,
      clientSecret,
      amount,
      currency,
      status: 'requires_payment',
      reservationIds,
      userId,
      createdAt: new Date()
    };

    paymentIntents.set(paymentIntentId, intent);

    res.status(201).json({
      success: true,
      clientSecret,
      paymentIntentId,
      amount,
      currency,
      status: 'requires_payment'
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

    // Update status to processing
    intent.status = 'processing';

    // Simulate 1.5s payment processing delay
    await delay(1500);

    // Generate a transaction ID
    const transactionId = generateId('txn');

    // Update seat reservations to BOOKED
    const reservations = await SeatReservation.updateMany(
      {
        _id: { $in: intent.reservationIds },
        userId: req.user!.id,
        status: SeatStatus.LOCKED
      },
      {
        status: SeatStatus.BOOKED,
        transactionId,
        $unset: { expiresAt: 1 }
      }
    );

    if (reservations.modifiedCount === 0) {
      intent.status = 'failed';
      return res.status(400).json({ success: false, message: 'No valid locked seats found. They may have expired.' });
    }

    // Update the payment intent
    intent.status = 'succeeded';
    intent.transactionId = transactionId;

    // Emit socket event to notify other users
    getIO().emit('seats_booked', { reservationIds: intent.reservationIds, transactionId });

    res.status(200).json({
      success: true,
      status: 'succeeded',
      transactionId
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
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      transactionId: intent.transactionId || null,
      createdAt: intent.createdAt
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
