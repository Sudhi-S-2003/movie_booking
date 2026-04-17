export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  THEATRE_OWNER: 'theatre_owner',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AuthProvider = {
  LOCAL: 'local',
  GOOGLE: 'google',
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const MovieStatus = {
  NOW_SHOWING: 'now-showing',
  UPCOMING: 'upcoming',
  ARCHIVED: 'archived',
} as const;
export type MovieStatus = (typeof MovieStatus)[keyof typeof MovieStatus];

export const SeatStatus = {
  AVAILABLE: 'available',
  LOCKED: 'locked',
  BOOKED: 'booked',
} as const;
export type SeatStatus = (typeof SeatStatus)[keyof typeof SeatStatus];

export const ShowFormat = {
  TWO_D: '2D',
  THREE_D: '3D',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  DOLBY_ATMOS: 'Dolby Atmos',
} as const;
export type ShowFormat = (typeof ShowFormat)[keyof typeof ShowFormat];

export const PricingTier = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
  RECLINER: 'recliner',
  VIP: 'vip',
} as const;
export type PricingTier = (typeof PricingTier)[keyof typeof PricingTier];
