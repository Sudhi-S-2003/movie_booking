import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export type TransactionType = 'credit' | 'debit';
export type TokenType = 'chat' | 'nexus';

export interface TokenTransactionAttrs {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  tokenType: TokenType;
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TokenTransactionDoc = HydratedDocument<TokenTransactionAttrs>;

const TokenTransactionSchema = new Schema<TokenTransactionAttrs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    tokenType: { type: String, enum: ['chat', 'nexus'], required: true },
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, required: true },
    referenceId: { type: String },
  },
  { timestamps: true }
);

TokenTransactionSchema.index({ userId: 1, createdAt: -1 });

// Automatically delete token logs after 7 days (7 * 24 * 60 * 60 = 604800 seconds)
TokenTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export const TokenTransaction = mongoose.model<TokenTransactionAttrs>('TokenTransaction', TokenTransactionSchema);
