import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Reconnection policy:
 *   - Keep trying forever.
 *   - Exponential-ish backoff capped at 30s so a reachable server never
 *     makes the user wait longer than that for a retry.
 *   - 20s per-attempt timeout so a half-open network doesn't stall us.
 *
 * Combined with the `visibilitychange` / `online` listeners registered in
 * `EmitterSocket`, this is what makes the socket self-heal without a reload.
 */
const SOCKET_OPTIONS = {
  autoConnect:           false,
  withCredentials:       true,
  reconnection:          true,
  reconnectionAttempts:  Infinity,
  reconnectionDelay:     1_000,
  reconnectionDelayMax: 30_000,
  randomizationFactor:   0.5,
  timeout:              20_000,
} as const;

let guestAuth: { signature: string; expiresAt: string; conversationId: string } | null = null;

/** Set / clear guest credentials before any authenticated socket connects. */
export const setGuestSocketAuth = (auth: typeof guestAuth) => {
  guestAuth = auth;
};

/**
 * Create a socket for a namespace.
 *
 * When `authenticated` is true the JWT token (or guest signature) is attached
 * via a callback so the **latest** value is re-read on every reconnect —
 * if the user re-logs in while the socket was down, the new token is used
 * automatically.
 */
export const createSocket = (namespace: string, authenticated = false): Socket => {
  if (authenticated) {
    return io(`${SOCKET_URL}${namespace}`, {
      ...SOCKET_OPTIONS,
      auth: (cb) => {
        const token = useAuthStore.getState().token;
        cb({
          token: token ?? '',
          ...(guestAuth || {}),
        });
      },
    });
  }
  return io(`${SOCKET_URL}${namespace}`, SOCKET_OPTIONS);
};
