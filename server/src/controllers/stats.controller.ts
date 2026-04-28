import type { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import { Movie } from '../models/movie.model.js';
import { Theatre } from '../models/theatre.model.js';
import { Screen } from '../models/screen.model.js';
import { Showtime } from '../models/showtime.model.js';
import { SeatReservation } from '../models/seatReservation.model.js';
import { Review } from '../models/review.model.js';
import { Post } from '../models/post.model.js';
import { Hashtag } from '../models/hashtag.model.js';
import { MovieStatus, SeatStatus } from '../constants/enums.js';
import { getErrorMessage } from '../utils/error.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';

/**
 * GET /api/stats/platform
 *
 * Public, lightweight rollup the landing page and marketing widgets use.
 * Every count is a single indexed query, so this scales to millions of rows
 * without materializing lists.
 */
export const getPlatformStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalMovies,
      nowShowing,
      upcomingMovies,
      totalTheatres,
      totalShowtimes,
      totalBookings,
      totalReviews,
      totalPosts,
      totalHashtags,
    ] = await Promise.all([
      User.estimatedDocumentCount(),
      Movie.estimatedDocumentCount(),
      Movie.countDocuments({ showStatus: MovieStatus.NOW_SHOWING }),
      Movie.countDocuments({ showStatus: MovieStatus.UPCOMING }),
      Theatre.estimatedDocumentCount(),
      Showtime.estimatedDocumentCount(),
      SeatReservation.countDocuments({ status: SeatStatus.BOOKED }),
      Review.estimatedDocumentCount(),
      Post.estimatedDocumentCount(),
      Hashtag.estimatedDocumentCount(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users:      totalUsers,
        movies:     totalMovies,
        nowShowing,
        upcoming:   upcomingMovies,
        theatres:   totalTheatres,
        showtimes:  totalShowtimes,
        bookings:   totalBookings,
        reviews:    totalReviews,
        posts:      totalPosts,
        hashtags:   totalHashtags,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/**
 * GET /api/stats/admin
 *
 * Richer rollup for the admin dashboard: uses an aggregation pipeline to
 * get top genres + daily booking buckets for the past 7 days.
 */
export const getAdminStats = async (_req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [platform, topGenres, recentBookings, topMovies] = await Promise.all([
      Promise.all([
        User.estimatedDocumentCount(),
        Movie.estimatedDocumentCount(),
        Theatre.estimatedDocumentCount(),
        SeatReservation.countDocuments({ status: SeatStatus.BOOKED }),
      ]),

      Movie.aggregate([
        { $unwind: '$genres' },
        { $group: { _id: '$genres', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      SeatReservation.aggregate([
        { $match: { status: SeatStatus.BOOKED, createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count:   { $sum: 1 },
            revenue: { $sum: '$price' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      SeatReservation.aggregate([
        { $match: { status: SeatStatus.BOOKED } },
        {
          $lookup: {
            from: 'showtimes',
            localField: 'showtimeId',
            foreignField: '_id',
            as: 'showtime',
          },
        },
        { $unwind: '$showtime' },
        { $group: { _id: '$showtime.movieId', bookings: { $sum: 1 } } },
        { $sort: { bookings: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'movies',
            localField: '_id',
            foreignField: '_id',
            as: 'movie',
          },
        },
        { $unwind: '$movie' },
        {
          $project: {
            _id:      '$movie._id',
            title:    '$movie.title',
            posterUrl:'$movie.posterUrl',
            bookings: 1,
          },
        },
      ]),
    ]);

    const [users, movies, theatres, bookings] = platform;

    res.status(200).json({
      success: true,
      stats: {
        totals: { users, movies, theatres, bookings },
        topGenres:      topGenres.map((g) => ({ genre: g._id, count: g.count })),
        recentBookings, // [{ _id: 'YYYY-MM-DD', count, revenue }]
        topMovies,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/**
 * GET /api/stats/owner
 *
 * Operational stats for a theatre owner. Aggregates data across all
 * theatres they manage.
 */
export const getOwnerStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // 1. Identify all managed infrastructure
    const theatres = await Theatre.find({ ownerId: userId });
    const theatreIds = theatres.map(t => t._id);

    if (theatreIds.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalTheatres: 0,
          totalScreens: 0,
          totalShowtimes: 0,
          systemHealth: 100,
        }
      });
    }

    // 2. Rollup stats
    const [screenCount, showtimeCount] = await Promise.all([
      Screen.countDocuments({ theatreId: { $in: theatreIds } }),
      Showtime.countDocuments({ theatreId: { $in: theatreIds } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalTheatres: theatreIds.length,
        totalScreens: screenCount,
        totalShowtimes: showtimeCount,
        systemHealth: 100, // Placeholder
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
