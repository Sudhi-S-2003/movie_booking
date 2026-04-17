import type { Request, Response } from 'express';
import { Review } from '../models/review.model.js';
import { SeatReservation } from '../models/seatReservation.model.js';
import { Showtime } from '../models/showtime.model.js';
import { SeatStatus } from '../constants/enums.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { targetId, targetType, rating, comment } = req.body;
    const userId = req.user!.id;

    // Restriction: Only users who have booked can review movies
    if (targetType === 'Movie') {
      const showtimes = await Showtime.find({ movieId: targetId }).select('_id');
      const showtimeIds = showtimes.map(st => st._id);

      const hasBooked = await SeatReservation.findOne({
        userId,
        showtimeId: { $in: showtimeIds },
        status: SeatStatus.BOOKED
      });

      if (!hasBooked) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only review movies you have booked tickets for.' 
        });
      }
    }

    const review = await Review.create({
      userId,
      targetId,
      targetType,
      rating,
      comment
    });

    res.status(201).json({ success: true, review });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this.' });
    }
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

// GET /api/reviews/:targetId?page=&limit=
export const getReviewsByTarget = async (req: Request, res: Response) => {
  try {
    const targetId = req.params.targetId!;
    const page = parsePage(req);
    const filter = { targetId } as const;

    const [reviews, total, agg] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name username avatar')
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: { targetId: filter.targetId } },
        {
          $group: {
            _id: null,
            avg:   { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = agg[0] ?? { avg: 0, count: 0 };

    res.status(200).json({
      success:    true,
      reviews,
      pagination: buildPageEnvelope(total, page),
      stats:      { averageRating: stats.avg, totalReviews: stats.count },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
