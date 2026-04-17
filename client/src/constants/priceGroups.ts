
export const PRICE_GROUPS = ['STANDARD', 'PREMIUM', 'VIP', 'RECLINER'] as const;
export type PriceGroup = (typeof PRICE_GROUPS)[number];

export const PRICE_GROUP_SEAT_COLORS: Record<PriceGroup, string> = {
  STANDARD: 'bg-slate-700/50 border-slate-500/30 text-slate-300',
  PREMIUM:
    'bg-accent-blue/40 border-accent-blue/50 text-white shadow-[0_0_15px_rgba(31,182,255,0.3)]',
  VIP: 'bg-accent-purple/40 border-accent-purple/50 text-white shadow-[0_0_15px_rgba(109,40,217,0.3)]',
  RECLINER:
    'bg-accent-pink/40 border-accent-pink/50 text-white shadow-[0_0_15px_rgba(255,45,85,0.3)]',
};

export const PRICE_GROUP_BADGE_COLORS: Record<PriceGroup, string> = {
  STANDARD: 'bg-accent-blue/40 border-accent-blue/60 text-accent-blue',
  PREMIUM: 'bg-accent-purple/40 border-accent-purple/60 text-accent-purple',
  VIP: 'bg-yellow-500/40 border-yellow-500/60 text-yellow-500',
  RECLINER: 'bg-accent-pink/40 border-accent-pink/60 text-accent-pink',
};

export const PRICE_GROUP_MINI_BG: Record<PriceGroup, string> = {
  STANDARD: 'bg-slate-600',
  PREMIUM: 'bg-accent-blue',
  VIP: 'bg-accent-purple',
  RECLINER: 'bg-accent-pink',
};
