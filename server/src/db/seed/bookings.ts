import { SeatReservation } from '../../models/seatReservation.model.js';
import { SeatStatus, UserRole } from '../../constants/enums.js';
import { log, shuffle, randomInt, pick } from './helpers.js';
import type { UserDoc } from './users.js';
import type { ScreenDoc } from './theatres.js';
import type { ShowtimeDoc } from './showtimes.js';

const BOOKED_SHOWTIME_RATIO = 0.6;
const SEATS_PER_BOOKED_SHOWTIME: [min: number, max: number] = [4, 14];

/**
 * Extract every bookable seat id ("A-1", "B-3", ...) for a screen by walking
 * its layout. Separated so the main loop stays focused on picking showtimes.
 */
const buildScreenSeatMap = (screens: ScreenDoc[]): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  for (const screen of screens) {
    const seats: string[] = [];
    for (const row of screen.layout) {
      if (row.type !== 'row' || !row.columns) continue;
      for (const col of row.columns) {
        if (col.type === 'seat') seats.push(`${row.name}-${col.name}`);
      }
    }
    map.set(screen._id.toString(), seats);
  }
  return map;
};

const makeTxnId = () =>
  `TXN-${Math.random().toString(36).toUpperCase().slice(2, 10)}`;

export const seedBookings = async (
  users: UserDoc[],
  showtimes: ShowtimeDoc[],
  screens: ScreenDoc[],
) => {
  log('🎟️', 'Seeding sample bookings...');
  const customers = users.filter((u) => u.role === UserRole.USER);
  if (customers.length === 0 || showtimes.length === 0) return;

  const screenSeats = buildScreenSeatMap(screens);
  const [minSeats, maxSeats] = SEATS_PER_BOOKED_SHOWTIME;
  const chosenShowtimes = shuffle(showtimes).slice(
    0,
    Math.floor(showtimes.length * BOOKED_SHOWTIME_RATIO),
  );

  const rows: Array<Record<string, unknown>> = [];

  for (const showtime of chosenShowtimes) {
    const seats = screenSeats.get(showtime.screenId.toString());
    if (!seats || seats.length === 0) continue;

    const take = randomInt(minSeats, Math.min(maxSeats, seats.length));
    const bookedSeats = shuffle(seats).slice(0, take);

    for (const seatId of bookedSeats) {
      rows.push({
        showtimeId: showtime._id,
        userId: pick(customers)._id,
        seatId,
        status: SeatStatus.BOOKED,
        price: 250,
        transactionId: makeTxnId(),
      });
    }
  }

  await SeatReservation.insertMany(rows);
  log('✅', `${rows.length} seat bookings across ${chosenShowtimes.length} showtimes`);
};
