import type { Response } from 'express';
import { Movie } from '../models/movie.model.js';
import { Theatre } from '../models/theatre.model.js';
import { Issue } from '../models/issue.model.js';
import { User } from '../models/user.model.js';
import { enrichMovies } from '../utils/movie.utils.js';
import type { AuthRequest } from '../interfaces/auth.interface.js';
import { getErrorMessage } from '../utils/error.utils.js';

export const unifiedSearch = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, message: 'Query parameter "q" is required' });
    }

    let interpretedQ = q;
    let isHashtag = false;

    if (q.startsWith('#')) {
      isHashtag = true;
      interpretedQ = q.substring(1).replace(/_/g, ' ').trim();
    }

    const searchRegex = new RegExp(interpretedQ, 'i');

    // 1. SMART SIGNAL RESOLUTION (Exact Primary Match)
    const [primaryMovie, primaryTheatre, primaryUser] = await Promise.all([
      Movie.findOne({ title: { $regex: `^${interpretedQ}$`, $options: 'i' } }),
      Theatre.findOne({ name: { $regex: `^${interpretedQ}$`, $options: 'i' } }),
      User.findOne({ username: interpretedQ.toLowerCase() })
    ]);

    let primaryMatch: any = null;
    if (primaryUser) {
        primaryMatch = { type: 'user', data: primaryUser, redirectUrl: `/user/${primaryUser.username}` };
    } else if (primaryMovie) {
        primaryMatch = { type: 'movie', data: primaryMovie, redirectUrl: `/movie/${primaryMovie._id}` };
    } else if (primaryTheatre) {
        primaryMatch = { type: 'theatre', data: primaryTheatre, redirectUrl: `/theatre/${primaryTheatre._id}` };
    }

    // 2. BROAD SPECTRUM SEARCH
    const [movies, theatres, issues] = await Promise.all([
      Movie.find({
        $or: [
          { title: searchRegex },
          { genres: { $in: [searchRegex] } },
          { tags: { $in: [searchRegex] } }
        ]
      }).limit(5),
      Theatre.find({
        $or: [
          { name: searchRegex },
          { city: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      }).limit(5),
      Issue.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ]
      }).limit(5).populate('userId', 'name avatar')
    ]);

    const enrichedMovies = await enrichMovies(movies, req.user?.id);

    res.status(200).json({
      success: true,
      primaryMatch,
      results: {
        movies: enrichedMovies,
        theatres,
        issues: (issues as any[]).map(iss => ({
          ...iss.toObject(),
          type: 'support_ticket'
        }))
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
