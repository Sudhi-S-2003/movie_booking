import type { HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { usersSeedData } from '../seedData/users.data.js';
import { log } from './helpers.js';

export type UserDoc = HydratedDocument<IUser>;

export const seedUsers = async (): Promise<UserDoc[]> => {
  log('👥', 'Seeding users...');
  const password = await bcrypt.hash('password123', 10);
  const rows = usersSeedData.map((u) => ({ ...u, password }));
  const created = await User.insertMany(rows);
  log('✅', `${created.length} users seeded`);
  return created as UserDoc[];
};
