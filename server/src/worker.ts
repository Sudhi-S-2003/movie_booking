/**
 * Standalone notification worker entry point.
 *
 * Runs as a separate process from the API server. Connects to MongoDB
 * (for creating system messages) and Redis (for BullMQ job processing).
 *
 * Usage:
 *   npm run worker          (production — runs compiled dist/worker.js)
 *   npm run worker:dev      (development — uses tsx with hot reload)
 */
import { env } from './env.js';
import mongoose from 'mongoose';
import { startNotificationWorker, stopNotificationWorker } from './workers/notification.worker.js';

const main = async () => {
  console.log('🔧 Notification Worker starting...');
  console.log(`   Environment: ${env.NODE_ENV}`);

  // Connect to MongoDB (worker needs it to create system messages)
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Start processing jobs
  startNotificationWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🔄 ${signal} received — shutting down worker...`);
    await stopNotificationWorker();
    await mongoose.disconnect();
    console.log('👋 Worker stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

main().catch((err) => {
  console.error('❌ Worker failed to start:', err);
  process.exit(1);
});
