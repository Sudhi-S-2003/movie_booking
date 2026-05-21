/**
 * Badge named color themes used for pill-shaped badge generation.
 * Each theme defines gradient start/end, border, and text color.
 *
 * Organized by color family — add new themes here to expand the supported set.
 */

export interface BadgeTheme {
  bgStart: string;
  bgEnd:   string;
  border:  string;
  text:    string;
}

export const BADGE_THEMES: Record<string, BadgeTheme> = {

  // ─── Neutrals ────────────────────────────────────────────────────────────────
  slate:      { bgStart: '#e2e8f0', bgEnd: '#475569', border: '#64748b', text: '#0f172a' },
  gray:       { bgStart: '#f3f4f6', bgEnd: '#6b7280', border: '#9ca3af', text: '#111827' },
  zinc:       { bgStart: '#f4f4f5', bgEnd: '#52525b', border: '#71717a', text: '#09090b' },
  neutral:    { bgStart: '#f5f5f5', bgEnd: '#525252', border: '#737373', text: '#0a0a0a' },
  stone:      { bgStart: '#f5f5f4', bgEnd: '#57534e', border: '#78716c', text: '#0c0a09' },
  white:      { bgStart: '#ffffff', bgEnd: '#e5e7eb', border: '#d1d5db', text: '#111827' },
  black:      { bgStart: '#374151', bgEnd: '#111827', border: '#1f2937', text: '#f9fafb' },
  dark:       { bgStart: '#1e293b', bgEnd: '#0f172a', border: '#334155', text: '#f1f5f9' },

  // ─── Metals & Prestige ───────────────────────────────────────────────────────
  gold:       { bgStart: '#fef08a', bgEnd: '#ca8a04', border: '#eab308', text: '#451a03' },
  silver:     { bgStart: '#f3f4f6', bgEnd: '#9ca3af', border: '#d1d5db', text: '#111827' },
  bronze:     { bgStart: '#fed7aa', bgEnd: '#b45309', border: '#ea580c', text: '#431407' },
  platinum:   { bgStart: '#e2e8f0', bgEnd: '#94a3b8', border: '#cbd5e1', text: '#0f172a' },
  copper:     { bgStart: '#fde68a', bgEnd: '#b45309', border: '#d97706', text: '#1c1917' },
  titanium:   { bgStart: '#d1d5db', bgEnd: '#4b5563', border: '#6b7280', text: '#111827' },

  // ─── Reds ────────────────────────────────────────────────────────────────────
  red:        { bgStart: '#fecaca', bgEnd: '#dc2626', border: '#ef4444', text: '#450a0a' },
  rose:       { bgStart: '#fecdd3', bgEnd: '#e11d48', border: '#f43f5e', text: '#4c0519' },
  crimson:    { bgStart: '#fca5a5', bgEnd: '#b91c1c', border: '#dc2626', text: '#7f1d1d' },
  maroon:     { bgStart: '#fca5a5', bgEnd: '#7f1d1d', border: '#991b1b', text: '#fef2f2' },
  coral:      { bgStart: '#fed7aa', bgEnd: '#f97316', border: '#fb923c', text: '#431407' },

  // ─── Pinks ───────────────────────────────────────────────────────────────────
  pink:       { bgStart: '#fbcfe8', bgEnd: '#db2777', border: '#ec4899', text: '#500724' },
  fuchsia:    { bgStart: '#f5d0fe', bgEnd: '#c026d3', border: '#d946ef', text: '#4a044e' },
  magenta:    { bgStart: '#fae8ff', bgEnd: '#a21caf', border: '#c026d3', text: '#3b0764' },
  hotpink:    { bgStart: '#fce7f3', bgEnd: '#db2777', border: '#f472b6', text: '#831843' },

  // ─── Purples ─────────────────────────────────────────────────────────────────
  purple:     { bgStart: '#ede9fe', bgEnd: '#7c3aed', border: '#8b5cf6', text: '#2e1065' },
  violet:     { bgStart: '#ddd6fe', bgEnd: '#7c3aed', border: '#8b5cf6', text: '#2e1065' },
  indigo:     { bgStart: '#e0e7ff', bgEnd: '#4338ca', border: '#6366f1', text: '#1e1b4b' },
  lavender:   { bgStart: '#f5f3ff', bgEnd: '#7c3aed', border: '#a78bfa', text: '#4c1d95' },
  plum:       { bgStart: '#ede9fe', bgEnd: '#6d28d9', border: '#7c3aed', text: '#2e1065' },
  grape:      { bgStart: '#f3e8ff', bgEnd: '#9333ea', border: '#a855f7', text: '#3b0764' },

  // ─── Blues ───────────────────────────────────────────────────────────────────
  blue:       { bgStart: '#bfdbfe', bgEnd: '#2563eb', border: '#3b82f6', text: '#1e3a8a' },
  sky:        { bgStart: '#bae6fd', bgEnd: '#0284c7', border: '#0ea5e9', text: '#0c4a6e' },
  cyan:       { bgStart: '#cffafe', bgEnd: '#0891b2', border: '#06b6d4', text: '#083344' },
  navy:       { bgStart: '#bfdbfe', bgEnd: '#1e3a8a', border: '#2563eb', text: '#eff6ff' },
  ocean:      { bgStart: '#bae6fd', bgEnd: '#0369a1', border: '#0284c7', text: '#082f49' },
  azure:      { bgStart: '#dbeafe', bgEnd: '#1d4ed8', border: '#2563eb', text: '#1e3a8a' },
  cobalt:     { bgStart: '#bfdbfe', bgEnd: '#1d4ed8', border: '#3b82f6', text: '#1e1b4b' },
  sapphire:   { bgStart: '#dbeafe', bgEnd: '#1e40af', border: '#2563eb', text: '#1e3a8a' },
  arctic:     { bgStart: '#e0f2fe', bgEnd: '#0284c7', border: '#38bdf8', text: '#0c4a6e' },

  // ─── Greens ──────────────────────────────────────────────────────────────────
  green:      { bgStart: '#bbf7d0', bgEnd: '#16a34a', border: '#22c55e', text: '#14532d' },
  emerald:    { bgStart: '#a7f3d0', bgEnd: '#059669', border: '#10b981', text: '#022c22' },
  teal:       { bgStart: '#99f6e4', bgEnd: '#0f766e', border: '#14b8a6', text: '#042f2e' },
  lime:       { bgStart: '#d9f99d', bgEnd: '#65a30d', border: '#84cc16', text: '#1a2e05' },
  mint:       { bgStart: '#d1fae5', bgEnd: '#059669', border: '#34d399', text: '#064e3b' },
  sage:       { bgStart: '#dcfce7', bgEnd: '#15803d', border: '#4ade80', text: '#14532d' },
  forest:     { bgStart: '#bbf7d0', bgEnd: '#14532d', border: '#16a34a', text: '#f0fdf4' },
  olive:      { bgStart: '#ecfccb', bgEnd: '#4d7c0f', border: '#84cc16', text: '#1a2e05' },
  jade:       { bgStart: '#a7f3d0', bgEnd: '#047857', border: '#10b981', text: '#022c22' },

  // ─── Yellows & Oranges ───────────────────────────────────────────────────────
  yellow:     { bgStart: '#fef9c3', bgEnd: '#ca8a04', border: '#eab308', text: '#422006' },
  amber:      { bgStart: '#fde68a', bgEnd: '#d97706', border: '#f59e0b', text: '#451a03' },
  orange:     { bgStart: '#fed7aa', bgEnd: '#c2410c', border: '#f97316', text: '#431407' },
  saffron:    { bgStart: '#fef08a', bgEnd: '#b45309', border: '#f59e0b', text: '#451a03' },
  honey:      { bgStart: '#fef3c7', bgEnd: '#d97706', border: '#fbbf24', text: '#451a03' },
  peach:      { bgStart: '#ffedd5', bgEnd: '#ea580c', border: '#fb923c', text: '#431407' },
  tangerine:  { bgStart: '#fed7aa', bgEnd: '#ea580c', border: '#f97316', text: '#7c2d12' },
  rust:       { bgStart: '#fecaca', bgEnd: '#b91c1c', border: '#c2410c', text: '#7f1d1d' },

  // ─── Neons / Vibrant ─────────────────────────────────────────────────────────
  neon:       { bgStart: '#d9f99d', bgEnd: '#16a34a', border: '#4ade80', text: '#052e16' },
  'neon-pink': { bgStart: '#fce7f3', bgEnd: '#db2777', border: '#f472b6', text: '#4a044e' },
  'neon-blue': { bgStart: '#dbeafe', bgEnd: '#2563eb', border: '#60a5fa', text: '#1e1b4b' },
  electric:   { bgStart: '#e0e7ff', bgEnd: '#4338ca', border: '#818cf8', text: '#1e1b4b' },
  vibrant:    { bgStart: '#fae8ff', bgEnd: '#9333ea', border: '#e879f9', text: '#3b0764' },
  lava:       { bgStart: '#fef08a', bgEnd: '#dc2626', border: '#f97316', text: '#7f1d1d' },
  toxic:      { bgStart: '#d9f99d', bgEnd: '#65a30d', border: '#a3e635', text: '#1a2e05' },

  // ─── Pastels ─────────────────────────────────────────────────────────────────
  'pastel-pink':    { bgStart: '#fdf2f8', bgEnd: '#fbcfe8', border: '#f9a8d4', text: '#831843' },
  'pastel-blue':    { bgStart: '#eff6ff', bgEnd: '#bfdbfe', border: '#93c5fd', text: '#1e3a8a' },
  'pastel-green':   { bgStart: '#f0fdf4', bgEnd: '#bbf7d0', border: '#86efac', text: '#14532d' },
  'pastel-yellow':  { bgStart: '#fefce8', bgEnd: '#fef08a', border: '#fde047', text: '#713f12' },
  'pastel-purple':  { bgStart: '#faf5ff', bgEnd: '#e9d5ff', border: '#d8b4fe', text: '#581c87' },
  'pastel-orange':  { bgStart: '#fff7ed', bgEnd: '#fed7aa', border: '#fdba74', text: '#7c2d12' },

  // ─── Special / Gradient ──────────────────────────────────────────────────────
  sunset:     { bgStart: '#fde68a', bgEnd: '#be185d', border: '#f97316', text: '#1c1917' },
  aurora:     { bgStart: '#a7f3d0', bgEnd: '#7c3aed', border: '#34d399', text: '#1e1b4b' },
  twilight:   { bgStart: '#ddd6fe', bgEnd: '#1e1b4b', border: '#7c3aed', text: '#e9d5ff' },
  midnight:   { bgStart: '#1e3a8a', bgEnd: '#0f172a', border: '#2563eb', text: '#bfdbfe' },
  galaxy:     { bgStart: '#4c1d95', bgEnd: '#0f172a', border: '#7c3aed', text: '#e9d5ff' },
  nebula:     { bgStart: '#831843', bgEnd: '#1e1b4b', border: '#db2777', text: '#fce7f3' },
  prism:      { bgStart: '#dbeafe', bgEnd: '#4a044e', border: '#8b5cf6', text: '#f5f3ff' },
  candy:      { bgStart: '#fce7f3', bgEnd: '#db2777', border: '#f9a8d4', text: '#fdf2f8' },
  holographic:{ bgStart: '#bfdbfe', bgEnd: '#a7f3d0', border: '#c4b5fd', text: '#0f172a' },

  // ─── Themes by Mood ──────────────────────────────────────────────────────────
  success:    { bgStart: '#d1fae5', bgEnd: '#059669', border: '#10b981', text: '#064e3b' },
  warning:    { bgStart: '#fef3c7', bgEnd: '#d97706', border: '#f59e0b', text: '#451a03' },
  error:      { bgStart: '#fee2e2', bgEnd: '#dc2626', border: '#ef4444', text: '#7f1d1d' },
  info:       { bgStart: '#dbeafe', bgEnd: '#2563eb', border: '#3b82f6', text: '#1e3a8a' },
  new:        { bgStart: '#d9f99d', bgEnd: '#16a34a', border: '#22c55e', text: '#14532d' },
  hot:        { bgStart: '#fef08a', bgEnd: '#dc2626', border: '#f97316', text: '#7f1d1d' },
  cool:       { bgStart: '#bae6fd', bgEnd: '#0369a1', border: '#38bdf8', text: '#082f49' },
  premium:    { bgStart: '#fef08a', bgEnd: '#7c3aed', border: '#eab308', text: '#1e1b4b' },
  pro:        { bgStart: '#e0e7ff', bgEnd: '#4338ca', border: '#6366f1', text: '#1e1b4b' },
  beta:       { bgStart: '#fae8ff', bgEnd: '#9333ea', border: '#a855f7', text: '#3b0764' },
  live:       { bgStart: '#fecaca', bgEnd: '#dc2626', border: '#ef4444', text: '#450a0a' },
  vip:        { bgStart: '#fef08a', bgEnd: '#ca8a04', border: '#eab308', text: '#451a03' },
  free:       { bgStart: '#bbf7d0', bgEnd: '#16a34a', border: '#22c55e', text: '#14532d' },
  sale:       { bgStart: '#fecaca', bgEnd: '#be123c', border: '#f43f5e', text: '#4c0519' },
};

/** All valid theme names (useful for validation or documentation). */
export const BADGE_THEME_NAMES: string[] = Object.keys(BADGE_THEMES);

export const BADGE_MIN_WIDTH = 20;
export const BADGE_MAX_WIDTH = 1000;
export const BADGE_DEFAULT_WIDTH = 120;

export const BADGE_MIN_HEIGHT = 10;
export const BADGE_MAX_HEIGHT = 200;
export const BADGE_DEFAULT_HEIGHT = 36;
