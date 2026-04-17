import { Watchlist } from '../models/watchlist.model.js';

/**
 * Enriches a list of movie documents with personalization flags (isWatchlisted, isInterested).
 * @param movies Mongoose movie documents or objects
 * @param userId The ID of the currently logged-in user (optional)
 */
export const enrichMovies = async (movies: any[], userId?: string) => {
  let userWatchlistIds: string[] = [];

  if (userId) {
    const watchlistItems = await Watchlist.find({ userId }).select('movieId');
    userWatchlistIds = watchlistItems.map(item => item.movieId.toString());
  }

  return movies.map(movie => {
    // Handle both Mongoose documents and plain objects
    const movieObj = typeof movie.toObject === 'function' ? movie.toObject() : movie;
    const movieIdStr = movieObj._id.toString();

    return {
      ...movieObj,
      isWatchlisted: userWatchlistIds.includes(movieIdStr),
      isInterested: userId ? movieObj.interestedUsers?.some((id: any) => id.toString() === userId.toString()) : false
    };
  });
};

/**
 * Enriches a single movie document with personalization flags.
 * @param movie Mongoose movie document or object
 * @param userId The ID of the currently logged-in user (optional)
 */
export const enrichMovie = async (movie: any, userId?: string) => {
  let isWatchlisted = false;

  if (userId && movie) {
    const exists = await Watchlist.exists({ userId, movieId: movie._id });
    isWatchlisted = !!exists;
  }

  const movieObj = typeof movie.toObject === 'function' ? movie.toObject() : movie;

  return {
    ...movieObj,
    isWatchlisted,
    isInterested: userId ? movieObj.interestedUsers?.some((id: any) => id.toString() === userId.toString()) : false
  };
};
