import mongoose from 'mongoose';

export interface ISession {
  userId: mongoose.Types.ObjectId;
  userAgent: string;
  ip: string;
  lastActive: Date;
  isValid: boolean;
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
  },
  { timestamps: true }
);

export const Session = mongoose.model<ISession>('Session', sessionSchema);
