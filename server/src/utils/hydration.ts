import { User } from '../models/user.model.js';

/**
 * Hydrates a list of rows that reference a user (authorId, userId, etc.) by
 * populating a lightweight `author` / `user` object on each row. Single DB
 * round-trip regardless of the number of rows, so it scales well.
 */
export const hydrateByUserField = async <
  T extends Record<string, unknown>,
  K extends keyof T,
>(
  rows: T[],
  sourceKey: K,
  targetKey: string = 'author',
): Promise<Array<T & Record<string, unknown>>> => {
  if (rows.length === 0) return rows;

  const ids = [...new Set(rows.map((r) => String(r[sourceKey])))];
  const users = await User.find({ _id: { $in: ids } })
    .select('name username avatar role')
    .lean();

  const map = new Map(users.map((u) => [String(u._id), u]));
  return rows.map((r) => ({
    ...r,
    [targetKey]: map.get(String(r[sourceKey])) ?? null,
  }));
};

/** Convenience wrapper for the common "posts -> author" case. */
export const hydrateAuthors = <T extends { authorId: unknown }>(rows: T[]) =>
  hydrateByUserField(rows, 'authorId', 'author');

/** Convenience wrapper for the common "comments -> user" case. */
export const hydrateUsers = <T extends { userId: unknown }>(rows: T[]) =>
  hydrateByUserField(rows, 'userId', 'user');
