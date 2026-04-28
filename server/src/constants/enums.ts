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

export const MovieCertification = {
  U: 'U',
  UA: 'UA',
  A: 'A',
  R: 'R',
} as const;
export type MovieCertification = (typeof MovieCertification)[keyof typeof MovieCertification];

export const Language = {
  ENGLISH: 'English',
  HINDI: 'Hindi',
  TAMIL: 'Tamil',
  MALAYALAM: 'Malayalam',
  TELUGU: 'Telugu',
  KANNADA: 'Kannada',
  SPANISH: 'Spanish',
  FRENCH: 'French',
  GERMAN: 'German',
  JAPANESE: 'Japanese',
  KOREAN: 'Korean',
} as const;
export type Language = (typeof Language)[keyof typeof Language];

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

export const IntegrationType = {
  TELINFY: 'telinfy',
} as const;
export type IntegrationType = (typeof IntegrationType)[keyof typeof IntegrationType];

export const NotificationType = {
  SECURITY_ALERT: 'security_alert',
  BOOKING_CONFIRMED: 'booking_confirmed',
  SYSTEM: 'system',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];


// ── System Account ──────────────────────────────────────────────────────────
// Internal server-side account used for system messages, notifications, etc.
// This is NOT a real user — it's auto-created on first use (ensureSystemUser).

export const SYSTEM_ACCOUNT = {
  EMAIL:    'system@cinemaconnect.com',
  USERNAME: 'cinemaconnect',
  NAME:     'CinemaConnect',
  ROLE:     UserRole.ADMIN,
} as const;
