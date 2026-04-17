import { env } from './env.js';
import mongoose from 'mongoose';

import { UserRole } from './constants/enums.js';
import {
  clearDatabase,
  seedUsers,
  seedMovies,
  seedTheatresAndScreens,
  seedShowtimes,
  seedWatchlists,
  seedReviews,
  seedBookings,
  seedIssues,
  seedHashtagsAndPosts,
  seedUserFollows,
} from './db/seed/index.js';

const log = (icon: string, msg: string) => console.log(`${icon}  ${msg}`);

const run = async () => {
  try {
    log('🚀', `Connecting to ${env.MONGODB_URI}`);
    await mongoose.connect(env.MONGODB_URI);

    await clearDatabase();

    const users = await seedUsers();
    const owner = users.find((u) => u.role === UserRole.THEATRE_OWNER);
    if (!owner) throw new Error('Theatre owner user missing after seed');

    const movies = await seedMovies(users);
    const { screens } = await seedTheatresAndScreens(owner._id);
    const showtimes = await seedShowtimes(movies, screens);

    await seedWatchlists(users, movies);
    await seedReviews(users, movies);
    await seedBookings(users, showtimes, screens);
    await seedIssues(users);
    await seedHashtagsAndPosts(users, movies);
    await seedUserFollows(users);

    log('🍿', 'Seeding complete. CinemaConnect is fully operational.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

run();
