import type { Request } from 'express';

/**
 * Safely extracts a string parameter from a request.
 * Handles cases where the parameter might be an array or undefined.
 */
export const getParam = (req: Request, name: string): string => {
  const val = req.params[name];
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
};

/**
 * Safely extracts a string query parameter from a request.
 */
export const getQueryParam = (req: Request, name: string): string => {
  const val = req.query[name];
  if (Array.isArray(val)) return String(val[0]) || '';
  return val ? String(val) : '';
};
