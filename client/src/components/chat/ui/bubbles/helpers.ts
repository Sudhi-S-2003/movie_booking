/**
 * Shared helpers for message bubble components. Kept tiny and dependency-free
 * so every bubble can import what it needs without inflating bundle size.
 */

/**
 * Format a byte count as `124 KB` / `2.1 MB` / `3.4 GB`. Uses binary units
 * (1024) since that matches what most OSes display.
 */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, i);
  // One decimal for MB+, zero for B / KB — keeps things compact.
  const formatted = i >= 2 ? value.toFixed(1) : Math.round(value).toString();
  return `${formatted} ${units[i]}`;
};

/**
 * Truncate a long filename by replacing the middle with an ellipsis while
 * keeping the extension intact. Example:
 *   truncateMiddle('a-very-long-document-name.pdf', 20) →
 *   'a-very-lon…name.pdf'
 */
export const truncateMiddle = (name: string, max = 24): string => {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : '';
  const base = ext ? name.slice(0, name.length - ext.length) : name;
  const keep = Math.max(4, max - ext.length - 1); // 1 for the ellipsis
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  if (base.length <= keep) return name;
  return `${base.slice(0, head)}…${base.slice(base.length - tail)}${ext}`;
};

/**
 * Six deterministic accent gradients for avatar placeholders. We hash the
 * name to an index so the same person always gets the same colour — stable
 * across renders and sessions without a lookup table.
 */
const GRADIENT_PALETTE = [
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-fuchsia-500 to-rose-600',
];

export const gradientForName = (name: string): string => {
  if (!name) return GRADIENT_PALETTE[0]!;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return GRADIENT_PALETTE[Math.abs(hash) % GRADIENT_PALETTE.length]!;
};

/**
 * Classify a filename by extension so FileBubble can pick a coloured badge.
 */
export type FileKind = 'pdf' | 'zip' | 'image' | 'other';

export const fileKindFromName = (name: string): FileKind => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'zip';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext)) {
    return 'image';
  }
  return 'other';
};

export const fileKindBadge: Record<FileKind, string> = {
  pdf:   'bg-red-500/15 border-red-400/30 text-red-300',
  zip:   'bg-amber-500/15 border-amber-400/30 text-amber-300',
  image: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
  other: 'bg-slate-500/15 border-slate-400/30 text-slate-300',
};

/**
 * Derive a filename from a URL — strips query/hash, URL-decodes the last
 * segment, falls back to `file` if anything looks wrong.
 */
export const fileNameFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() ?? 'file';
    return decodeURIComponent(last);
  } catch {
    const cleaned = url.split(/[?#]/)[0] ?? '';
    return cleaned.split('/').pop() || 'file';
  }
};
