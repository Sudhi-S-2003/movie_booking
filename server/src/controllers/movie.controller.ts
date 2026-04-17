import type { Request, Response } from 'express';
import { Movie } from '../models/movie.model.js';
import { enrichMovie, enrichMovies } from '../utils/movie.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';
import { parsePage, buildPageEnvelope } from '../utils/pagination.js';

export const createMovie = async (req: Request, res: Response) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json({ success: true, movie });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMovies = async (req: AuthRequest, res: Response) => {
  try {
    const pageParams = parsePage(req);
    const { skip, limit, page } = pageParams;

    const { status, genre, search, q, minimal } = req.query;
    const filter: any = {};
    
    if (status && typeof status === 'string') filter.showStatus = status;
    if (genre && typeof genre === 'string') filter.genres = { $in: genre.split(',') };
    if (q) filter.title = { $regex: q as string, $options: 'i' };
    else if (search) filter.title = { $regex: search, $options: 'i' };

    let queryBuilder = Movie.find(filter);
    if (minimal) queryBuilder = queryBuilder.select('title _id posterUrl');

    const [movies, total] = await Promise.all([
      queryBuilder
        .sort(q ? { title: 1 } : { releaseDate: -1 })
        .skip(skip)
        .limit(limit),
      Movie.countDocuments(filter)
    ]);

    const enrichedMovies = await enrichMovies(movies, req.user?.id);

    res.status(200).json({
      success: true,
      movies: enrichedMovies,
      pagination: buildPageEnvelope(total, pageParams),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getMovieById = async (req: AuthRequest, res: Response) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    const enrichedMovie = await enrichMovie(movie, req.user?.id);

    res.status(200).json({ success: true, movie: enrichedMovie });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const updateMovie = async (req: Request, res: Response) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    res.status(200).json({ success: true, movie });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const deleteMovie = async (req: Request, res: Response) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    res.status(200).json({ success: true, message: 'Movie deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const toggleInterest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    const index = movie.interestedUsers.indexOf(userId as any);
    if (index === -1) {
      movie.interestedUsers.push(userId as any);
    } else {
      movie.interestedUsers.splice(index, 1);
    }

    await movie.save();
    res.status(200).json({ success: true, interestedUsers: movie.interestedUsers, isInterested: index === -1 });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
