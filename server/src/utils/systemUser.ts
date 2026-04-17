/**
 * System user — an internal server-side account used as the sender
 * for system messages, notifications, welcome messages, etc.
 *
 * Auto-created on first use (lazy initialization). Not part of seed data.
 * Cached in memory after first lookup so it's a single DB hit per process.
 */
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { SYSTEM_ACCOUNT, AuthProvider } from '../constants/enums.js';
import bcrypt from 'bcryptjs';

let cached: { _id: mongoose.Types.ObjectId; name: string } | null = null;

/**
 * Returns the system user's _id and name. Creates the user if it doesn't exist.
 * Safe to call from any controller or worker — idempotent.
 */
export const ensureSystemUser = async (): Promise<{ _id: mongoose.Types.ObjectId; name: string }> => {
  if (cached) return cached;

  let user = await User.findOne({ email: SYSTEM_ACCOUNT.EMAIL }).lean();

  if (!user) {
    // Create system user with a random unguessable password (never used for login)
    const randomPass = new mongoose.Types.ObjectId().toHexString() + '!Sys';
    const hashedPassword = await bcrypt.hash(randomPass, 10);

    const created = await User.create({
      name:         SYSTEM_ACCOUNT.NAME,
      username:     SYSTEM_ACCOUNT.USERNAME,
      email:        SYSTEM_ACCOUNT.EMAIL,
      password:     hashedPassword,
      role:         SYSTEM_ACCOUNT.ROLE,
      authProvider: AuthProvider.LOCAL,
      avatar:       'https://i.pravatar.cc/300?u=cinemaconnect_system',
      bio:          'Official CinemaConnect system account.',
    });

    user = created.toObject();
    console.log('[SystemUser] Created system account:', SYSTEM_ACCOUNT.EMAIL);
  }

  cached = { _id: user!._id as mongoose.Types.ObjectId, name: user!.name as string };
  return cached;
};
