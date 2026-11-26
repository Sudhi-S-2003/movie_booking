import mongoose from 'mongoose';
import { Showtime } from '../../models/showtime.model.js';
import { Screen } from '../../models/screen.model.js';
import { PricingTier } from '../../constants/enums.js';

/** Default ticket price per seat tier (INR) when a showtime has no override. */
export const DEFAULT_TIER_PRICES: Record<string, number> = {
  [PricingTier.STANDARD]: 150,
  [PricingTier.PREMIUM]: 280,
  [PricingTier.RECLINER]: 450,
  [PricingTier.VIP]: 650,
};

const normalizeTier = (tier: unknown): string => String(tier || PricingTier.STANDARD).toLowerCase();

/**
 * Resolve authoritative prices for seats of a showtime. Prices are never
 * taken from the client. Returns null for any seat that doesn't exist in
 * the screen layout (or when the showtime is inactive / missing).
 */
export const resolveSeatPrices = async (
  showtimeId: string,
  seatIds: string[],
): Promise<Map<string, number> | null> => {
  if (!mongoose.isValidObjectId(showtimeId)) return null;
  const showtime = await Showtime.findOne({ _id: showtimeId, isActive: true }).lean();
  if (!showtime) return null;
  const screen = await Screen.findById(showtime.screenId).lean();
  if (!screen) return null;

  const overrides = new Map<string, number>(
    (showtime.pricingOverrides ?? [])
      .filter((o) => o.tier && typeof o.price === 'number')
      .map((o) => [normalizeTier(o.tier), o.price as number]),
  );

  // seatId format: "<Row>-<Seat>", e.g. "A-10".
  const tierBySeat = new Map<string, string>();
  for (const row of screen.layout ?? []) {
    if (row.type !== 'row' || !row.name) continue;
    for (const col of row.columns ?? []) {
      if (col.type === 'seat' && col.name) tierBySeat.set(`${row.name}-${col.name}`, normalizeTier(col.priceGroup));
    }
  }

  const prices = new Map<string, number>();
  for (const id of seatIds) {
    const tier = tierBySeat.get(id);
    if (!tier) return null;
    prices.set(id, overrides.get(tier) ?? DEFAULT_TIER_PRICES[tier] ?? DEFAULT_TIER_PRICES[PricingTier.STANDARD]!);
  }
  return prices;
};
