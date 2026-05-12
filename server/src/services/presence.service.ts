import { User } from '../models/user.model.js';
import { Session } from '../models/session.model.js';
import { getIO } from '../socket/index.js';

class PresenceService {
  /**
   * In-memory tracking for single-server scale.
   * Efficiently tracks active tabs without external dependencies.
   */
  private userConnections = new Map<string, number>();
  private sessionConnections = new Map<string, number>();
  private lastSyncTimes = new Map<string, number>();

  /**
   * Track a new connection for a user and session.
   * Updates DB if this is the first connection.
   */
  async handleConnection(userId: string | null, sessionId: string | null) {
    if (sessionId) {
      const current = this.sessionConnections.get(sessionId) || 0;
      const next = current + 1;
      this.sessionConnections.set(sessionId, next);

      if (next === 1) {
        await Session.findByIdAndUpdate(sessionId, { isOnline: true, lastActive: new Date() });
      }
    }

    if (userId) {
      const current = this.userConnections.get(userId) || 0;
      const next = current + 1;
      this.userConnections.set(userId, next);

      if (next === 1) {
        await User.findByIdAndUpdate(userId, { isOnline: true });
        this.broadcastStatus(userId, true);
      }
    }
  }

  /**
   * Track a disconnection.
   * Updates DB if this was the last active connection.
   */
  async handleDisconnect(userId: string | null, sessionId: string | null) {
    if (sessionId) {
      const current = this.sessionConnections.get(sessionId) || 1;
      const next = current - 1;

      if (next <= 0) {
        this.sessionConnections.delete(sessionId);
        this.lastSyncTimes.delete(sessionId);
        await Session.findByIdAndUpdate(sessionId, { isOnline: false, lastActive: new Date() });
      } else {
        this.sessionConnections.set(sessionId, next);
      }
    }

    if (userId) {
      const current = this.userConnections.get(userId) || 1;
      const next = current - 1;

      if (next <= 0) {
        this.userConnections.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        this.broadcastStatus(userId, false, lastSeen);
      } else {
        this.userConnections.set(userId, next);
      }
    }
  }

  /**
   * Throttled heartbeat to keep lastActive fresh in DB without overloading it.
   * Only writes to MongoDB if the last update was more than 15 minutes ago.
   */
  async updateHeartbeat(sessionId: string | null) {
    if (!sessionId) return;

    const now = Date.now();
    const lastSync = this.lastSyncTimes.get(sessionId) || 0;
    
    // Only hit DB if last sync was more than 15 minutes ago
    if (now - lastSync > 15 * 60 * 1000) {
      await Session.findByIdAndUpdate(sessionId, { lastActive: new Date() });
      this.lastSyncTimes.set(sessionId, now);
    }
  }

  private broadcastStatus(userId: string, isOnline: boolean, lastSeen?: Date) {
    try {
      const io = getIO();
      io.of('/presence').emit('status_change', { userId, isOnline, lastSeen });
    } catch (err) {
      // Socket might not be initialized yet during startup
    }
  }
}

export const presenceService = new PresenceService();
