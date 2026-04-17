import type { Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { Watchlist } from '../models/watchlist.model.js';
import { SeatReservation } from '../models/seatReservation.model.js';
import { Review } from '../models/review.model.js';
import { Issue } from '../models/issue.model.js';
import { User } from '../models/user.model.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import type { IWatchlist } from '../interfaces/models.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';

export const toggleWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const movieId = req.params.movieId as string;
    const userId = req.user!.id;

    const existing = await Watchlist.findOne({ userId, movieId });

    if (existing) {
      await Watchlist.findByIdAndDelete((existing as HydratedDocument<IWatchlist>)._id);
      return res.status(200).json({ success: true, added: false, message: 'Removed from watchlist' });
    }

    await Watchlist.create({ userId, movieId });
    res.status(200).json({ success: true, added: true, message: 'Added to watchlist' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parsePage(req);

    const [items, total] = await Promise.all([
      Watchlist.find({ userId })
        .populate('movieId')
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit),
      Watchlist.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success:    true,
      watchlist:  items.map((item) => item.movieId),
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const checkWatchlistStatus = async (req: AuthRequest, res: Response) => {
  try {
    const movieId = req.params.movieId as string;
    const userId = req.user!.id;

    const existing = await Watchlist.findOne({ userId, movieId });
    res.status(200).json({ success: true, isWatchlisted: !!existing });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parsePage(req, 20);
    const { q, role } = req.query as { q?: string; role?: string };
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { name:     { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email:    { $regex: q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success:    true,
      users,
      pagination: buildPageEnvelope(total, page),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    let user;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(id).select('-password');
    } else {
      user = await User.findOne({ username: id.toLowerCase() }).select('-password');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch live statistics concurrently
    const [bookingsCount, reviewsCount, watchlistCount, issuesCount] = await Promise.all([
      SeatReservation.countDocuments({ userId: user._id, status: 'BOOKED' }),
      Review.countDocuments({ userId: user._id }),
      Watchlist.countDocuments({ userId: user._id }),
      Issue.countDocuments({ userId: user._id })
    ]);

    // Construct the response object
    const isOwner = currentUserId && user._id.toString() === currentUserId;
    const rawUser = user.toObject();

    // Type-safe property removal for public view
    const filteredUser: any = { ...rawUser };
    if (!isOwner && !isAdmin) {
      delete filteredUser.email;
      delete filteredUser.phoneNumber;
    }

    res.status(200).json({ 
      success: true, 
      user: {
        ...filteredUser,
        stats: {
          bookings: bookingsCount,
          reviews: reviewsCount,
          watchlist: watchlistCount,
          issues: issuesCount
        }
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
