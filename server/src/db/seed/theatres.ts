import type { HydratedDocument, Types } from 'mongoose';
import { Theatre } from '../../models/theatre.model.js';
import { Screen } from '../../models/screen.model.js';
import type { ITheatre, IScreen, RefId } from '../../interfaces/models.interface.js';
import { theatresData, generateLayout } from '../seedData/theatres.data.js';
import { log, toTag } from './helpers.js';

export type TheatreDoc = HydratedDocument<ITheatre>;
export type ScreenDoc  = HydratedDocument<IScreen>;

export const seedTheatresAndScreens = async (
  ownerId: RefId,
): Promise<{ theatres: TheatreDoc[]; screens: ScreenDoc[] }> => {
  log('🏛️', 'Seeding theatres and screens...');
  const theatres: TheatreDoc[] = [];
  const screens:  ScreenDoc[] = [];

  for (const t of theatresData) {
    const theatre = await Theatre.create({
      name: t.name,
      city: t.city,
      address: t.address,
      ownerId,
      location: t.location,
      amenities: t.amenities,
      tags: [toTag(t.name), toTag(t.city), ...t.amenities.map(toTag)],
    });
    theatres.push(theatre);

    for (const s of t.screens) {
      const layout = generateLayout(s.type, s.rows, s.cols);
      const totalCapacity = layout.reduce((sum, item) => {
        if (item.type !== 'row' || !item.columns) return sum;
        return sum + item.columns.filter((c) => c.type === 'seat').length;
      }, 0);

      const screen = await Screen.create({
        name: s.name,
        theatreId: theatre._id.toString(),
        layout,
        totalCapacity,
      });
      screens.push(screen);
    }
  }

  log('✅', `${theatres.length} theatres and ${screens.length} screens seeded`);
  return { theatres, screens };
};
