/**
 * Safely extract a human-readable message from an unknown error.
 *
 * Use this in `catch (err: unknown)` blocks instead of casting to `any` or
 * accessing `.message` directly. It covers the three shapes that actually
 * show up in practice — Error instances, thrown strings, and everything
 * else (which gets stringified).
 */
export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};
