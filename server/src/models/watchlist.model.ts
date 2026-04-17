import mongoose, { Schema } from 'mongoose';
import type { IWatchlist } from '../interfaces/models.interface.js';

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index to ensure uniqueness and fast lookup
WatchlistSchema.index({ userId: 1, movieId: 1 }, { unique: true });

// Index for paginated list queries
WatchlistSchema.index({ userId: 1, createdAt: -1 });

export const Watchlist = mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
