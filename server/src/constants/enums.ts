/**
 * Platform roles (hierarchical, highest first).
 *  - super_admin: the platform owner. Protected, unlimited wallet, every
 *    permission (including ones added in future releases). Created only by
 *    the startup bootstrap, never through the API.
 *  - admin: platform staff with delegated management permissions.
 *  - reseller: manages its own customers (and sub-resellers if permitted).
 *  - user: an end customer.
 */
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  RESELLER: 'reseller',
  USER: 'user',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles that act on behalf of the platform (support staff, moderation). */
export const STAFF_ROLES: ReadonlySet<string> = new Set([UserRole.SUPER_ADMIN, UserRole.ADMIN]);

/** Roles that own a customer subtree. */
export const RESELLER_ROLES: ReadonlySet<string> = new Set([UserRole.SUPER_ADMIN, UserRole.RESELLER]);

export const UserStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  /** Soft-deleted: cannot log in, data retained for financial records. */
  CLOSED: 'closed',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const AuthProvider = {
  LOCAL: 'local',
  GOOGLE: 'google',
  /** Internal non-login account (system messages). */
  SYSTEM: 'system',
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
  EMAIL:    'system@platform.internal',
  USERNAME: 'system',
  NAME:     'Platform',
  ROLE:     UserRole.USER,
} as const;

export const ApiServiceCategory = {
  CHAT: 'chat',
  CODE_SHARE: 'code-share',
  CODE_SHARE_V2: 'code-share-v2',
} as const;
export type ApiServiceCategory = (typeof ApiServiceCategory)[keyof typeof ApiServiceCategory];

