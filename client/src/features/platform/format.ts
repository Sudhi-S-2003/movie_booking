import { ApiError } from '../../services/api/http.js';

/** Human-readable message for any thrown value (ApiError carries the server message). */
export const errorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  if (err instanceof ApiError) {
    const first = err.fieldErrors ? Object.values(err.fieldErrors)[0] : undefined;
    return first ? `${err.message}: ${first}` : err.message;
  }
  return err instanceof Error ? err.message : fallback;
};

export const formatDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
