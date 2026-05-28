import mongoose, { Schema, Document } from 'mongoose';

export interface PaymentTransactionDoc extends Document {
  userId: mongoose.Types.ObjectId;
  paymentIntentId: string;
  transactionId: string;
  amount: number;
  currency: string;
  kind: 'seat' | 'subscription' | 'booster';
  description: string;
  status: 'succeeded' | 'failed' | 'refunded';
  createdAt: Date;
}

const PaymentTransactionSchema = new Schema<PaymentTransactionDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  paymentIntentId: { type: String, required: true },
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  kind: { type: String, enum: ['seat', 'subscription', 'booster'], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['succeeded', 'failed', 'refunded'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const PaymentTransaction = mongoose.model<PaymentTransactionDoc>('PaymentTransaction', PaymentTransactionSchema);
