import mongoose from 'mongoose';
import type { Request } from 'express';
import { Theatre } from '../../models/theatre.model.js';
import { Screen } from '../../models/screen.model.js';
import { Showtime } from '../../models/showtime.model.js';
import { isStaff } from '../access/access.service.js';

/**
 * Movie-service operators may only act on their own theatres and the
 * screens/showtimes inside them. Platform staff may act on any.
 */
const ownerFilter = (req: Request): Record<string, unknown> => (req.user && isStaff(req.user) ? {} : { ownerId: req.user?._id ?? null });

export const ownsTheatre = async (req: Request, theatreId: unknown): Promise<boolean> =>
  mongoose.isValidObjectId(theatreId) && !!(await Theatre.exists({ _id: String(theatreId), ...ownerFilter(req) } as Record<string, unknown>));

export const ownsScreen = async (req: Request, screenId: unknown): Promise<boolean> => {
  if (!mongoose.isValidObjectId(screenId)) return false;
  const screen = await Screen.findById(screenId).select('theatreId').lean();
  return !!screen && ownsTheatre(req, screen.theatreId);
};

export const ownsShowtime = async (req: Request, showtimeId: unknown): Promise<boolean> => {
  if (!mongoose.isValidObjectId(showtimeId)) return false;
  const showtime = await Showtime.findById(showtimeId).select('theatreId').lean();
  return !!showtime && ownsTheatre(req, showtime.theatreId);
};

/** Fields an operator may set on a showtime. */
export const pickShowtimeFields = (body: Record<string, unknown>) => {
  const allowed = ['movieId', 'startTime', 'endTime', 'format', 'isActive', 'pricingOverrides'] as const;
  return Object.fromEntries(allowed.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
};
