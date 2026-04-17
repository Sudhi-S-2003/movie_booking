/**
 * Shared helpers for seed modules. Keeping them in one tiny file means every
 * seeder imports the same RNG and logger without creating a circular mess.
 */

export const pick = <T>(arr: readonly T[]): T => {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) throw new Error('pick() called on empty array');
  return item;
};

export const shuffle = <T>(arr: readonly T[]): T[] =>
  [...arr].sort(() => Math.random() - 0.5);

export const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const toTag = (s: string) =>
  s.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');

export const log = (icon: string, msg: string) => console.log(`${icon}  ${msg}`);
