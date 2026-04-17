import { User } from '../../models/user.model.js';
import { UserFollow } from '../../models/userFollow.model.js';
import { log, shuffle, randomInt } from './helpers.js';
import type { UserDoc } from './users.js';

type Counter = { followers: number; following: number };

export const seedUserFollows = async (users: UserDoc[]) => {
  log('🤝', 'Seeding user follow graph...');
  const rows: Array<Record<string, unknown>> = [];
  const counters = new Map<string, Counter>();

  const bump = (id: string, key: keyof Counter) => {
    const curr = counters.get(id) ?? { followers: 0, following: 0 };
    curr[key] += 1;
    counters.set(id, curr);
  };

  for (const follower of users) {
    const candidates = users.filter(
      (u) => u._id.toString() !== follower._id.toString(),
    );
    const targets = shuffle(candidates).slice(
      0,
      randomInt(1, Math.min(3, candidates.length)),
    );
    for (const target of targets) {
      rows.push({ followerId: follower._id, followingId: target._id });
      bump(follower._id.toString(), 'following');
      bump(target._id.toString(), 'followers');
    }
  }

  if (rows.length) {
    try {
      await UserFollow.insertMany(rows, { ordered: false });
    } catch {
      /* dupes ignored */
    }
  }

  await Promise.all(
    Array.from(counters.entries()).map(([id, c]) =>
      User.updateOne(
        { _id: id },
        { $set: { followerCount: c.followers, followingCount: c.following } },
      ),
    ),
  );

  log('✅', `${rows.length} follow edges seeded`);
};
