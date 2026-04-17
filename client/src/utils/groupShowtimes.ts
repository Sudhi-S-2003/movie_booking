
import type { Showtime, Theatre, Screen, ID } from '../types/models.js';
import type { ShowFormat } from '../constants/enums.js';

export interface GroupedShowtime {
  id: ID;
  time: string;
}

export interface GroupedScreen {
  name: string;
  format: ShowFormat;
  times: GroupedShowtime[];
}

export interface GroupedTheatre {
  id: ID;
  name: string;
  city: string;
  screens: Record<ID, GroupedScreen>;
}

type PopulatedTheatre = Pick<Theatre, '_id' | 'name' | 'city'>;
type PopulatedScreen = Pick<Screen, '_id' | 'name'>;

const asPopulatedTheatre = (v: Showtime['theatreId']): PopulatedTheatre | null =>
  typeof v === 'object' && v !== null ? (v as PopulatedTheatre) : null;

const asPopulatedScreen = (v: Showtime['screenId']): PopulatedScreen | null =>
  typeof v === 'object' && v !== null ? (v as PopulatedScreen) : null;

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const groupShowtimesByTheatre = (
  showtimes: Showtime[],
): Record<ID, GroupedTheatre> => {
  const acc: Record<ID, GroupedTheatre> = {};

  for (const st of showtimes) {
    const populatedTheatre = asPopulatedTheatre(st.theatreId);
    const populatedScreen = asPopulatedScreen(st.screenId);
    if (!populatedTheatre || !populatedScreen) continue;

    const theatreId = populatedTheatre._id;
    const screenId = populatedScreen._id;

    const theatre =
      acc[theatreId] ??
      (acc[theatreId] = {
        id: theatreId,
        name: populatedTheatre.name,
        city: populatedTheatre.city,
        screens: {},
      });

    const screen =
      theatre.screens[screenId] ??
      (theatre.screens[screenId] = {
        name: populatedScreen.name,
        format: st.format,
        times: [],
      });

    screen.times.push({ id: st._id, time: formatTime(st.startTime) });
  }

  return acc;
};
