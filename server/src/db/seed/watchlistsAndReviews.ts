import { Watchlist } from '../../models/watchlist.model.js';
import { Review } from '../../models/review.model.js';
import { UserRole } from '../../constants/enums.js';
import { log, shuffle, randomInt, pick } from './helpers.js';
import { reviewComments } from '../seedData/posts.data.js';
import type { UserDoc } from './users.js';
import type { MovieDoc } from './movies.js';

export const seedWatchlists = async (users: UserDoc[], movies: MovieDoc[]) => {
  log('🔖', 'Seeding watchlists...');
  const customers = users.filter((u) => u.role === UserRole.USER);

  const rows = customers.flatMap((user) =>
    shuffle(movies)
      .slice(0, randomInt(3, 8))
      .map((movie) => ({ userId: user._id, movieId: movie._id })),
  );

  await Watchlist.insertMany(rows);
  log('✅', `${rows.length} watchlist items seeded`);
};

export const seedReviews = async (users: UserDoc[], movies: MovieDoc[]) => {
  log('⭐', 'Seeding reviews...');

  const rows = movies.flatMap((movie) => {
    const reviewers = shuffle(users).slice(0, randomInt(2, 4));
    return reviewers.map((user) => ({
      userId: user._id,
      targetId: movie._id,
      targetType: 'Movie',
      rating: randomInt(7, 10),
      comment: pick(reviewComments),
    }));
  });

  await Review.insertMany(rows);
  log('✅', `${rows.length} reviews seeded`);
};
