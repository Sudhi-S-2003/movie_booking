import mongoose, { Schema } from 'mongoose';
import type { ISeatReservation } from '../interfaces/models.interface.js';
import { SeatStatus } from '../constants/enums.js';

const SeatReservationSchema = new Schema<ISeatReservation>(
  {
    showtimeId: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seatId: { type: String, required: true }, // Format: "Row-Name" (e.g., "A-10")
    status: { 
      type: String, 
      enum: Object.values(SeatStatus), 
      default: SeatStatus.LOCKED 
    },
    price: { type: Number, required: true },
    expiresAt: { 
      type: Date, 
      required: function(this: ISeatReservation) { return this.status === SeatStatus.LOCKED; } 
    },
    transactionId: { type: String }
  },
  { timestamps: true }
);

// CRITICAL: TTL Index for automatic lock release after 10 minutes
// MongoDB will delete the document when the current time reaches expiresAt
SeatReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure a seat cannot be locked twice for the same showtime
SeatReservationSchema.index({ showtimeId: 1, seatId: 1 }, { unique: true });
// Profile/activity queries: latest bookings for a user
SeatReservationSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Admin/stats: bookings grouped by day, filtered by status
SeatReservationSchema.index({ status: 1, createdAt: -1 });

export const SeatReservation = mongoose.model<ISeatReservation>('SeatReservation', SeatReservationSchema);
