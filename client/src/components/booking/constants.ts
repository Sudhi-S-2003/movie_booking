export const normalizeTier = (tier: string): string => (tier || 'standard').toLowerCase();

export type TierColor = { base: string; selected: string; label: string; dot: string };

export const getTierColor = (tier: string): TierColor =>
  TIER_COLORS[normalizeTier(tier)] ?? TIER_COLORS.standard!;

export const TIER_COLORS: Record<string, TierColor> = {
  standard: {
    base: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10',
    selected: 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]',
    label: 'text-emerald-400',
    dot: 'bg-emerald-500',
  },
  premium: {
    base: 'border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10',
    selected: 'bg-accent-blue border-accent-blue text-white shadow-[0_0_16px_rgba(31,182,255,0.4)]',
    label: 'text-accent-blue',
    dot: 'bg-accent-blue',
  },
  recliner: {
    base: 'border-accent-pink/40 text-accent-pink hover:bg-accent-pink/10',
    selected: 'bg-accent-pink border-accent-pink text-white shadow-[0_0_16px_rgba(255,45,85,0.4)]',
    label: 'text-accent-pink',
    dot: 'bg-accent-pink',
  },
  vip: {
    base: 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10',
    selected: 'bg-amber-500 border-amber-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.4)]',
    label: 'text-amber-400',
    dot: 'bg-amber-500',
  },
};

export const PRICE_MAP: Record<string, number> = {
  standard: 150,
  premium: 280,
  recliner: 450,
  vip: 650,
};

export const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  premium: 'Premium',
  recliner: 'Recliner',
  vip: 'VIP Lounge',
};
