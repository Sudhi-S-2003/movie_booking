import type { Request, Response } from 'express';
import { Theatre } from '../models/theatre.model.js';
import { Screen } from '../models/screen.model.js';
import { Showtime } from '../models/showtime.model.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';

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
    const [theatres, total] = await Promise.all([
      Theatre.find(filter)
        .select('name city _id')
        .sort({ name: 1 })
        .skip(page.skip)
        .limit(page.limit),
      Theatre.countDocuments(filter),
    ]);

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

import { Movie } from '../models/movie.model.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';

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
