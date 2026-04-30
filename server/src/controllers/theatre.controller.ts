import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Theatre } from '../models/theatre.model.js';
import { Showtime } from '../models/showtime.model.js';
import { Review } from '../models/review.model.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';
import { getParam } from '../utils/params.utils.js';

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

// GET /api/theatres/cities?q=&page=&limit=
export const getCities = async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q?: string };
    const page = parsePage(req);
    
    // Find all unique cities
    let allCities = await Theatre.distinct('city');
    
    // Filter by search query if provided
    if (q) {
      allCities = allCities.filter(c => c.toLowerCase().includes(q.toLowerCase()));
    }
    
    allCities.sort();
    
    const total = allCities.length;
    const paginatedCities = allCities.slice(page.skip, page.skip + page.limit);

    res.status(200).json({
      success: true,
      cities: paginatedCities,
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
    const id = getParam(req, 'id');
    const { date, isActive, q, movieId } = req.query as { date?: string; isActive?: string; q?: string; movieId?: string };
    const pageParams = parsePage(req, 20);

    const match: any = { theatreId: new Types.ObjectId(id) };

    if (movieId) {
      match.movieId = new Types.ObjectId(movieId);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      match.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    if (isActive !== undefined) {
      match.isActive = isActive === 'true';
    } else {
      match.isActive = true;
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'movies',
          localField: 'movieId',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      {
        $lookup: {
          from: 'screens',
          localField: 'screenId',
          foreignField: '_id',
          as: 'screen'
        }
      },
      { $unwind: '$screen' }
    ];

    // Filter by movie title
    if (q) {
      pipeline.push({
        $match: { 'movie.title': { $regex: q, $options: 'i' } }
      });
    }

    pipeline.push({ $sort: { startTime: 1 } });

    // Handle Pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    
    pipeline.push({ $skip: pageParams.skip });
    pipeline.push({ $limit: pageParams.limit });

    pipeline.push({
      $project: {
        _id: 1,
        movieId: '$movie',
        theatreId: 1,
        screenId: '$screen',
        startTime: 1,
        endTime: 1,
        format: 1,
        isActive: 1,
        pricingOverrides: 1
      }
    });

    const [showtimes, totalRes] = await Promise.all([
      Showtime.aggregate(pipeline),
      Showtime.aggregate(countPipeline)
    ]);

    const total = totalRes[0]?.total || 0;

    res.status(200).json({
      success: true,
      showtimes,
      pagination: buildPageEnvelope(total, pageParams)
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
