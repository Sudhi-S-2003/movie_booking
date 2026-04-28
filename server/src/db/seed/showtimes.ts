import type { HydratedDocument } from 'mongoose';
import { Showtime } from '../../models/showtime.model.js';
import type { IShowtime } from '../../interfaces/models.interface.js';
import { ShowFormat, PricingTier, MovieStatus } from '../../constants/enums.js';
import { log } from './helpers.js';
import type { MovieDoc } from './movies.js';
import type { ScreenDoc } from './theatres.js';

export type ShowtimeDoc = HydratedDocument<IShowtime>;

const TIME_SLOTS = ['10:00', '13:30', '17:00', '20:30', '23:45'] as const;
const DAYS_AHEAD = 7;

const detectFormat = (screenName: string): ShowFormat => {
  if (screenName.includes('IMAX')) return ShowFormat.IMAX;
  if (screenName.includes('4DX')) return ShowFormat.FOUR_DX;
  return ShowFormat.TWO_D;
};

const buildShowtimeRow = (
  movie: MovieDoc,
  screen: ScreenDoc,
  base: Date,
  slot: string,
): Partial<IShowtime> => {
  const parts = slot.split(':');
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);

  const startTime = new Date(base);
  startTime.setHours(hour, minute, 0, 0);
  const endTime = new Date(startTime.getTime() + movie.duration * 60_000);

  return {
    movieId: movie._id.toString(),
    theatreId: screen.theatreId.toString(),
    screenId: screen._id.toString(),
    startTime,
    endTime,
    format: detectFormat(screen.name),
    isActive: true,
    pricingOverrides: [
      { tier: PricingTier.STANDARD, price: 250 },
      { tier: PricingTier.PREMIUM,  price: 450 },
      { tier: PricingTier.RECLINER, price: 750 },
    ],
  };
};

export const seedShowtimes = async (
  movies: MovieDoc[],
  screens: ScreenDoc[],
): Promise<ShowtimeDoc[]> => {
  log('🕒', `Generating showtimes for the next ${DAYS_AHEAD} days...`);

  const nowShowing = movies.filter((m) => m.showStatus === MovieStatus.NOW_SHOWING);
  if (nowShowing.length === 0) return [];

  const rows: Partial<IShowtime>[] = [];

  for (let day = 0; day < DAYS_AHEAD; day++) {
    const base = new Date();
    base.setDate(base.getDate() + day);

    screens.forEach((screen, screenIdx) => {
      TIME_SLOTS.forEach((slot, slotIdx) => {
        const movie = nowShowing[(screenIdx + slotIdx + day) % nowShowing.length];
        if (!movie) return;
        rows.push(buildShowtimeRow(movie, screen, base, slot));
      });
    });
  }

  const created = await Showtime.insertMany(rows);
  log('✅', `${created.length} showtimes seeded`);
  return created as ShowtimeDoc[];
};
