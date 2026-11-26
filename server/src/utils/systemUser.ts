/**
 * System user — internal sender for system messages and notifications.
 * It has no password and the `system` auth provider, so it can never log in.
 * Auto-created on first use and cached per process.
 */
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { SYSTEM_ACCOUNT, AuthProvider, UserStatus } from '../constants/enums.js';

let cached: { _id: mongoose.Types.ObjectId; name: string } | null = null;

export const ensureSystemUser = async (): Promise<{ _id: mongoose.Types.ObjectId; name: string }> => {
  if (cached) return cached;
  const user = await User.findOneAndUpdate(
    { email: SYSTEM_ACCOUNT.EMAIL },
    {
      $setOnInsert: {
        name: SYSTEM_ACCOUNT.NAME,
        username: SYSTEM_ACCOUNT.USERNAME,
        email: SYSTEM_ACCOUNT.EMAIL,
        role: SYSTEM_ACCOUNT.ROLE,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.SYSTEM,
        bio: 'Official platform system account.',
      },
    },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  cached = { _id: user!._id as mongoose.Types.ObjectId, name: user!.name };
  return cached;
};
