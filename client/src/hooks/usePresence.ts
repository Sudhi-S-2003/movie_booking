import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { createSocket } from '../services/socket/connection.js';
import { Socket } from 'socket.io-client';

/**
 * Hook to track user presence (online status) via WebSockets.
 * Connects to the /presence namespace when the user is logged in.
 */
export const usePresence = () => {
  const { isAuthenticated, token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only connect if authenticated and we have a token
    if (isAuthenticated && token) {
      if (!socketRef.current) {
        socketRef.current = createSocket('/presence', true);
        
        socketRef.current.on('connect', () => {
          console.log('[Presence] Connected to server');
        });

        socketRef.current.on('disconnect', () => {
          console.log('[Presence] Disconnected from server');
        });

        socketRef.current.on('connect_error', (err) => {
          if (err.message === 'timeout' || err.message === 'xhr poll error') return;
          console.error('[Presence] Connection error:', err.message);
        });

        socketRef.current.connect();
      }
    } else {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token]);
};
