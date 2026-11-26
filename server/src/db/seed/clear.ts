import mongoose from 'mongoose';
import { log } from './helpers.js';

/**
 * Reset the development database. Drops the whole database: platform
 * collections (ledger, audit log) are append-only and refuse row deletes by
 * design, so a full drop is the only clean reset. Never run against production.
 */
export const clearDatabase = async () => {
  log('🗑️', 'Dropping development database...');
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes();
  log('✅', 'Database reset');
};
