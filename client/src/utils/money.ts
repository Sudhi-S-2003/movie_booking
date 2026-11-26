/**
 * Money arrives from the API as integer micro-units (1 INR = 1,000,000).
 * Format for display, and convert user input (rupees) back to micros.
 */
export const MICROS = 1_000_000;

export const formatMoney = (micros: number | null | undefined, currency = 'INR'): string => {
  if (micros === null || micros === undefined || Number.isNaN(micros)) return '—';
  const value = micros / MICROS;
  // Small per-unit prices need more precision than whole-rupee balances.
  const digits = Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: digits }).format(value);
};

/** Parse a rupee amount typed by a user into micros; null when invalid. */
export const toMicros = (input: string): number | null => {
  const n = Number(input.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * MICROS);
};

/** Basis points → "12.5%". */
export const formatBps = (bps: number): string => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
