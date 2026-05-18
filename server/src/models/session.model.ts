import mongoose from 'mongoose';

export interface ISession {
  userId: mongoose.Types.ObjectId;
  userAgent: string;
  ip: string;
  lastActive: Date;
  isValid: boolean;
  isOnline: boolean;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new mongoose.Schema<ISession>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    refreshTokenExpiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>('Session', sessionSchema);
