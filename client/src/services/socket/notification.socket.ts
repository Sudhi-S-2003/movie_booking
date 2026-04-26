import { createSocket } from './connection.js';

class NotificationSocketService {
  private socket = createSocket('/notification-push', true);
  private listeners: Set<(payload: any) => void> = new Set();

  constructor() {
    this.socket.on('notification_received', (payload) => {
      this.notify(payload);
    });
  }

  connect() {
    if (!this.socket.connected) this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  subscribe(listener: (payload: any) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(payload: any) {
    this.listeners.forEach(l => l(payload));
  }
}

export const notificationSocket = new NotificationSocketService();
