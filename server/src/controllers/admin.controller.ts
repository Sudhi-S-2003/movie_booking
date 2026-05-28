import type { Request, Response } from 'express';
import { Theatre } from '../models/theatre.model.js';
import { Screen } from '../models/screen.model.js';
import { Showtime } from '../models/showtime.model.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { Movie } from '../models/movie.model.js';
import { SubscriptionRequest } from '../models/subscriptionRequest.model.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';

/* ---------------- THEATRE MANAGEMENT ---------------- */

export const createTheatre = async (req: AuthRequest, res: Response) => {
  try {
    const theatreData = {
      ...req.body,
      ownerId: req.user!.id
    };
    const theatre = await Theatre.create(theatreData);
    res.status(201).json({ success: true, theatre });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMyTheatres = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    const filter: Record<string, unknown> = { ownerId: req.user!.id };

    if (q) {
      filter.name = { $regex: q as string, $options: 'i' };
    }

    const page = parsePage(req);
    
    // Use aggregation to count screens for each theatre
    const [results, total] = await Promise.all([
      Theatre.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'screens',
            localField: '_id',
            foreignField: 'theatreId',
            as: 'screens'
          }
        },
        {
          $addFields: {
            screenCount: { $size: '$screens' }
          }
        },
        { $project: { screens: 0 } }, // Remove full screen docs
        { $sort: { name: 1 } },
        { $skip: page.skip },
        { $limit: page.limit }
      ]),
      Theatre.countDocuments(filter),
    ]);

    // Manually populate ownerId names since aggregation lookup is heavier
    const theatres = await Theatre.populate(results, { path: 'ownerId', select: 'name email' });

    res.status(200).json({ success: true, theatres, pagination: buildPageEnvelope(total, page) });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/* ---------------- SCREEN MANAGEMENT ---------------- */

export const createScreen = async (req: Request, res: Response) => {
  try {
    const screen = await Screen.create(req.body);
    res.status(201).json({ success: true, screen });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getScreensByTheatre = async (req: Request, res: Response) => {
  try {
    const { theatreId } = req.params;
    const filter = { theatreId } as Record<string, unknown>;
    const page = parsePage(req);

    const [screens, total] = await Promise.all([
      Screen.find(filter).skip(page.skip).limit(page.limit),
      Screen.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, screens, pagination: buildPageEnvelope(total, page) });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const updateScreenLayout = async (req: Request, res: Response) => {
  try {
    const { layout, totalCapacity } = req.body;
    const screen = await Screen.findByIdAndUpdate(
      req.params.id,
      { layout, totalCapacity },
      { returnDocument: 'after' }
    );
    if (!screen) {
      return res.status(404).json({ success: false, message: 'Screen not found' });
    }
    res.status(200).json({ success: true, screen });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};


/* ---------------- SHOWTIME MANAGEMENT ---------------- */

export const createShowtime = async (req: AuthRequest, res: Response) => {
  try {
    const { movieId, theatreId, screenId, startTime } = req.body;

    // 1. Authorization: Ensure user owns the theatre
    const theatre = await Theatre.findOne({ _id: theatreId, ownerId: req.user!.id });
    if (!theatre) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You do not own this theatre' });
    }

    // 2. Fetch movie to calculate endTime
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + (movie.duration + 20) * 60000); // Duration + 20m cleanup

    // 3. Collision Detection
    const collision = await Showtime.findOne({
      screenId,
      $or: [
        { startTime: { $lt: end }, endTime: { $gt: start } }
      ]
    });

    if (collision) {
      return res.status(409).json({ 
        success: false, 
        message: `Collision detected! A performance of "${(collision as any).movieId?.title || 'Another Movie'}" is already scheduled in this window.` 
      });
    }

    const showtime = await Showtime.create({
      ...req.body,
      endTime: end
    });

    res.status(201).json({ success: true, showtime });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getShowtimesByScreen = async (req: Request, res: Response) => {
  try {
    const { screenId } = req.params;
    const filter = { screenId } as Record<string, unknown>;
    const page = parsePage(req);

    const [showtimes, total] = await Promise.all([
      Showtime.find(filter)
        .populate('movieId', 'title duration posterUrl')
        .sort({ startTime: 1 })
        .skip(page.skip)
        .limit(page.limit),
      Showtime.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, showtimes, pagination: buildPageEnvelope(total, page) });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const updateShowtime = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { movieId, startTime } = req.body;

    const existingShow = await Showtime.findById(id).populate('theatreId');
    if (!existingShow) return res.status(404).json({ success: false, message: 'Showtime not found' });

    // Authorization
    const theatre = await Theatre.findOne({ _id: existingShow.theatreId, ownerId: req.user!.id });
    if (!theatre) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // Re-calculate timing if movie or start time changed
    let end = existingShow.endTime;
    if (movieId || startTime) {
      const movie = await Movie.findById(movieId || existingShow.movieId);
      if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });
      
      const start = new Date(startTime || existingShow.startTime);
      end = new Date(start.getTime() + (movie.duration + 20) * 60000);
      
      // Collision check (excluding current show)
      const collision = await Showtime.findOne({
        _id: { $ne: id } as any,
        screenId: existingShow.screenId,
        $or: [
          { startTime: { $lt: end }, endTime: { $gt: start } }
        ]
      });

      if (collision) {
        return res.status(409).json({ success: false, message: 'Collision detected with another scheduled performance' });
      }
      
      req.body.endTime = end;
    }

    const updatedShowtime = await Showtime.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
    res.status(200).json({ success: true, showtime: updatedShowtime });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const deleteShowtime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const showtime = await Showtime.findByIdAndDelete(id);
    if (!showtime) {
      return res.status(404).json({ success: false, message: 'Showtime not found' });
    }
    res.status(200).json({ success: true, message: 'Showtime deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/* ---------------- SUBSCRIPTION REQUESTS MANAGEMENT ---------------- */

export const getSubscriptionRequests = async (req: Request, res: Response) => {
  try {
    const page = parsePage(req);
    const { status } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      SubscriptionRequest.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(page.skip)
        .limit(page.limit),
      SubscriptionRequest.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, requests, pagination: buildPageEnvelope(total, page) });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/** PATCH /api/admin/subscription-requests/:id — approve/reject enterprise quotes */
export const updateSubscriptionRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNote, discountPct } = req.body ?? {};

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const request = await SubscriptionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is already processed' });
    }

    request.status = status;
    if (typeof adminNote === 'string') request.adminNote = adminNote;
    
    // Only apply discount if approved and a valid number is provided
    let finalDiscountPct = 0;
    if (status === 'approved' && typeof discountPct === 'number' && discountPct >= 0 && discountPct <= 100) {
      request.discountPct = discountPct;
      finalDiscountPct = discountPct;
    }

    await request.save();

    if (status === 'approved') {
      // If approved, create a payment intent immediately so the user can just checkout
      const { paymentIntentsStore } = await import('./payment.controller.js');
      const { computeEnterprisePricing } = await import('../services/subscription/subscriptionPlans.js');
      
      const pricing = computeEnterprisePricing(request.monthlyLimit, request.durationMonths);
      
      // Apply the admin's custom discount on top of the base duration discount
      let priceInPaise = pricing.priceInPaise;
      if (finalDiscountPct > 0) {
        priceInPaise = Math.round(priceInPaise * (100 - finalDiscountPct) / 100);
      }
      
      const amount = priceInPaise;
      const currency = 'INR';
      
      const crypto = await import('crypto');
      const generateId = (prefix: string) => `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
      const paymentIntentId = generateId('pi');
      const clientSecret    = generateId('secret');

      paymentIntentsStore.set(paymentIntentId, {
        paymentIntentId,
        clientSecret,
        amount,
        currency,
        status:   'requires_payment',
        kind:     'subscription',
        userId:   String(request.userId),
        createdAt: new Date(),
        metadata: {
          plan: 'enterprise',
          customMonthlyLimit:   request.monthlyLimit,
          customDurationMonths: request.durationMonths,
          promoPct:       finalDiscountPct,
          originalPrice:  pricing.priceInPaise,
        },
      });
      // Optionally attach paymentIntentId to request or notify user
    }

    res.json({ success: true, request });
  } catch (e: unknown) {
    const { getErrorMessage } = await import('../utils/error.utils.js');
    res.status(500).json({ success: false, message: getErrorMessage(e) });
  }
};
