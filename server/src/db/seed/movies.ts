import type { HydratedDocument } from 'mongoose';
import { Movie } from '../../models/movie.model.js';
import type { IMovie } from '../../interfaces/models.interface.js';
import { MovieStatus } from '../../constants/enums.js';
import { moviesData } from '../seedData/movies.data.js';
import { log, shuffle, randomInt, toTag } from './helpers.js';
import type { UserDoc } from './users.js';

export type MovieDoc = HydratedDocument<IMovie>;

export const seedMovies = async (users: UserDoc[]): Promise<MovieDoc[]> => {
  log('🎬', `Seeding ${moviesData.length} movies...`);

  const enriched = moviesData.map((m) => {
    const interestedUsers =
      m.showStatus === MovieStatus.UPCOMING || Math.random() > 0.5
        ? shuffle(users).slice(0, randomInt(1, 3)).map((u) => u._id)
        : [];

    const tags = [
      ...m.genres.map(toTag),
      toTag(m.certification),
      toTag(m.language),
      toTag(m.title),
    ];

    return { ...m, interestedUsers, tags };
  });

  const created = await Movie.insertMany(enriched);
  log('✅', `${created.length} movies seeded`);
  return created as MovieDoc[];
};
