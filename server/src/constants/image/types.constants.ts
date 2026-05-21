/**
 * Supported badge types (standard, glowing, metallic).
 */
export const SUPPORTED_BADGE_TYPES = ['standard', 'glowing', 'metallic'] as const;

export type SupportedBadgeType = typeof SUPPORTED_BADGE_TYPES[number];
