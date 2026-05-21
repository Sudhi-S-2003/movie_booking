/**
 * Avatar background gradient themes used for initials and geometric avatars.
 */
export interface AvatarTheme {
  bgStart: string;
  bgEnd:   string;
  text:    string;
}

export const AVATAR_THEMES: Record<string, AvatarTheme> = {
  rose:     { bgStart: '#f43f5e', bgEnd: '#be123c', text: '#ffffff' },
  pink:     { bgStart: '#ec4899', bgEnd: '#be185d', text: '#ffffff' },
  fuchsia:  { bgStart: '#d946ef', bgEnd: '#a21caf', text: '#ffffff' },
  purple:   { bgStart: '#a855f7', bgEnd: '#7e22ce', text: '#ffffff' },
  indigo:   { bgStart: '#6366f1', bgEnd: '#4338ca', text: '#ffffff' },
  blue:     { bgStart: '#3b82f6', bgEnd: '#1d4ed8', text: '#ffffff' },
  sky:      { bgStart: '#0ea5e9', bgEnd: '#0369a1', text: '#ffffff' },
  cyan:     { bgStart: '#06b6d4', bgEnd: '#0e7490', text: '#ffffff' },
  teal:     { bgStart: '#14b8a6', bgEnd: '#0f766e', text: '#ffffff' },
  emerald:  { bgStart: '#10b981', bgEnd: '#047857', text: '#ffffff' },
  green:    { bgStart: '#22c55e', bgEnd: '#15803d', text: '#ffffff' },
  yellow:   { bgStart: '#eab308', bgEnd: '#a16207', text: '#ffffff' },
  orange:   { bgStart: '#f97316', bgEnd: '#c2410c', text: '#ffffff' },
};

export const AVATAR_THEME_NAMES: string[] = Object.keys(AVATAR_THEMES);

export const AVATAR_MIN_SIZE = 32;
export const AVATAR_MAX_SIZE = 512;
export const AVATAR_DEFAULT_SIZE = 200;
