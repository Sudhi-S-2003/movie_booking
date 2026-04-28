import mongoose, { Schema } from 'mongoose';
import type { IShowtime } from '../interfaces/models.interface.js';
import { ShowFormat, PricingTier } from '../constants/enums.js';

const ShowtimeSchema = new Schema<IShowtime>(
  {
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatreId: { type: Schema.Types.ObjectId, ref: 'Theatre', required: true },
    screenId: { type: Schema.Types.ObjectId, ref: 'Screen', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    format: { 
      type: String, 
      enum: Object.values(ShowFormat), 
      required: true 
    },
    isActive: { type: Boolean, default: true },
    pricingOverrides: [
      {
        tier: { type: String, enum: Object.values(PricingTier) },
        price: { type: Number }
      }
    ]
  },
  { timestamps: true }
);

// Index for fast showtime lookup by theatre and time
ShowtimeSchema.index({ theatreId: 1, startTime: 1 });
// Index for finding showtimes for a movie across all theatres in a city (via theatreId lookup)
ShowtimeSchema.index({ movieId: 1, startTime: 1 });

export const Showtime = mongoose.model<IShowtime>('Showtime', ShowtimeSchema);
