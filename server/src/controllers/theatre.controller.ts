import type { Request, Response } from 'express';
import { Theatre } from '../models/theatre.model.js';
import { Showtime } from '../models/showtime.model.js';
import { Review } from '../models/review.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';

// GET /api/theatres?city=&q=&page=&limit=
export const getAllTheatres = async (req: Request, res: Response) => {
  try {
    const { city, q } = req.query as { city?: string; q?: string };
    const filter: Record<string, unknown> = {};

    if (city) filter.city = city;
    if (q) filter.name = { $regex: q, $options: 'i' };

    const page = parsePage(req);
    const [theatres, total] = await Promise.all([
      Theatre.find(filter)
        .sort({ name: 1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Theatre.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      theatres,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/theatres/:id — detail only; reviews and showtimes are separate endpoints
export const getTheatreById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id!;
    const theatre = await Theatre.findById(id).lean();

    if (!theatre) {
      return res.status(404).json({ success: false, message: 'Theatre not found' });
    }

    res.status(200).json({ success: true, theatre });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/theatres/:id/reviews?page=&limit=
export const getTheatreReviews = async (req: Request, res: Response) => {
  try {
    const id = req.params.id!;
    const page = parsePage(req);
    const filter = { targetId: id, targetType: 'Theatre' } as const;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name username avatar')
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      reviews,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/theatres/:id/showtimes?from=&to=&page=&limit=
export const getShowtimesByTheatre = async (req: Request, res: Response) => {
  try {
    const id = req.params.id!;
    const { from, to } = req.query as { from?: string; to?: string };
    const page = parsePage(req, 30);

    const filter: Record<string, unknown> = { theatreId: id };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to)   range.$lte = new Date(to);
      filter.startTime = range;
    }

    const [showtimes, total] = await Promise.all([
      Showtime.find(filter)
        .populate('movieId')
        .populate('screenId')
        .sort({ startTime: 1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Showtime.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      showtimes,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
