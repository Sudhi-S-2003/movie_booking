import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SOCKET_OPTIONS = {
  autoConnect: false,
  withCredentials: true,
};

/**
 * Creates a socket for a namespace. If `authenticated` is true, the JWT
 * token is attached via `socket.handshake.auth.token` so the server can
 * identify the user without client-sent user IDs.
 */
export const createSocket = (namespace: string, authenticated = false): Socket => {
  const opts = { ...SOCKET_OPTIONS };

  if (authenticated) {
    return io(`${SOCKET_URL}${namespace}`, {
      ...opts,
      auth: (cb) => {
        const token = useAuthStore.getState().token;
        cb({ token: token ?? '' });
      },
    });
  }

  return io(`${SOCKET_URL}${namespace}`, opts);
};
