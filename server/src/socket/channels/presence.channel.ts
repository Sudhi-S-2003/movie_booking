import type { Namespace } from 'socket.io';
import { presenceService } from '../../services/presence.service.js';

export const registerPresenceHandlers = (ns: Namespace) => {
  ns.on('connection', async (socket) => {
    const userId = socket.data.userId;
    const sessionId = socket.data.sessionId;

    // Track online
    await presenceService.handleConnection(userId, sessionId);

    // Throttled heartbeat to keep lastActive fresh in DB
    const heartbeatInterval = setInterval(async () => {
      await presenceService.updateHeartbeat(sessionId);
    }, 5 * 60 * 1000); // Check every 5 minutes, service will throttle to 15 mins

    socket.on('disconnect', async () => {
      clearInterval(heartbeatInterval);
      // Track offline
      await presenceService.handleDisconnect(userId, sessionId);
    });

    // Optional: Add manual heartbeat if needed, but Socket.io has it built-in.
    // The disconnect event is usually enough.
  });
};
