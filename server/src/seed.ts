import { env } from './env.js';
import mongoose from 'mongoose';
import {
  clearDatabase, seedUsers, seedMovies, seedTheatresAndScreens, seedShowtimes, seedWatchlists,
  seedReviews, seedBookings, seedIssues, seedHashtagsAndPosts, seedUserFollows, seedChatbots, seedPlatform,
} from './db/seed/index.js';

const log = (icon: string, msg: string) => console.log(`${icon}  ${msg}`);

/**
 * Development seed: WIPES the database, then loads demo data for every
 * service plus the platform layer (super admin, reseller, wallets, pricing).
 *
 *   npm run seed
 *
 * Demo account password: SEED_USER_PASSWORD (default "Demo@12345").
 * Super admin: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD from .env.
 */
const run = async () => {
  if (env.NODE_ENV === 'production' && !process.argv.includes('--i-know-this-wipes-production')) {
    console.error('❌ Refusing to seed: NODE_ENV=production and seeding drops the whole database.');
    process.exit(1);
  }
  const password = process.env.SEED_USER_PASSWORD || 'Demo@12345';
  try {
    log('🚀', `Connecting to ${env.MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}`);
    await mongoose.connect(env.MONGODB_URI);
    await clearDatabase();

    const users = await seedUsers(password);
    const owner = users.find((u) => u.permissions?.includes('movies.operate'));
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
    await seedChatbots();
    await seedPlatform(users, password);

    log('🎉', 'Seeding complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

void run();
