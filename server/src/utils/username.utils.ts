import { User } from '../models/user.model.js';

/**
 * Generates `count` available username suggestions from a base string.
 *
 * Rounds (lazy — next round only runs if previous found nothing):
 *   Round 1: clean010 – clean099   (90 candidates, zero-padded)
 *   Round 2: clean100 – clean999   (900 candidates)
 *   Round 3: clean1000 – clean9999 (9000 candidates, last resort)
 *
 * Candidates are shuffled before the DB check so results are
 * varied (e.g. sudhi047, sudhi083) not sequential (010, 011, 012…).
 */

function* rounds(base: string): Generator<string[]> {
  const build = (min: number, max: number, pad: number) => {
    const out: string[] = [];
    for (let n = min; n <= max; n++) out.push(base + String(n).padStart(pad, '0'));
    return out;
  };

  yield build(10, 99, 3);     // sudhi010 … sudhi099
  yield build(100, 999, 0);   // sudhi100 … sudhi999
  yield build(1000, 9999, 0); // sudhi1000 … sudhi9999
}

function shuffle(arr: string[]): string[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

async function freeFrom(candidates: string[], count: number): Promise<string[]> {
  const shuffled = shuffle(candidates);
  const taken = await User.find(
    { username: { $in: shuffled } },
    { username: 1, _id: 0 },
  ).lean<{ username: string }[]>();
  const takenSet = new Set(taken.map((u) => u.username));
  return shuffled.filter((c) => !takenSet.has(c)).slice(0, count);
}

export async function generateUsernameSuggestions(base: string, count = 5): Promise<string[]> {
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'user';

  for (const round of rounds(clean)) {
    const free = await freeFrom(round, count);
    if (free.length > 0) return free; // found results → stop, never touch next round
  }

  return []; // unreachable in practice (9990 total slots across all rounds)
}
