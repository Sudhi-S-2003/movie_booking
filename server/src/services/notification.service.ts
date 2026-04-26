import { getIO } from '../socket/index.js';
import { UserRole } from '../constants/enums.js';

export type NotificationTarget = 'all' | 'guests' | 'authenticated' | 'admins' | 'owners' | `user_${string}`;

interface NotificationPayload {
  targets?: NotificationTarget[];
  userIds?: string[];    // New: send to specific raw user IDs
  title: string;
  message: string;
  url?: string;       // Dynamic link to navigate to on click
  icon?: string;      // Override icon
  image?: string;     // Large banner image
  badge?: string;     // Small status bar icon (mobile)
  tag?: string;       // Notification grouping ID
  data?: any;         // Arbitrary metadata
}

/**
 * Global notification service for sending real-time alerts to specific groups or users.
 */
class NotificationService {
  /**
   * Send a notification to one or more target rooms.
   */
  public sendNotification(payload: NotificationPayload) {
    try {
      const io = getIO();
      const namespace = io.of('/notification-push');

      // Collect all rooms to target
      const rooms = new Set<string>(payload.targets || []);
      if (payload.userIds) {
        payload.userIds.forEach(id => rooms.add(`user_${id}`));
      }

      if (rooms.size === 0) {
        console.warn('⚠️ [NOTIFICATION] No targets or userIds specified. Notification will not be sent.');
        return;
      }

      let broadcaster = namespace;
      
      // Chain rooms for targeting (OR logic in Socket.io)
      rooms.forEach(room => {
        broadcaster = broadcaster.to(room) as any;
      });

      broadcaster.emit('notification_received', {
        title: payload.title,
        message: payload.message,
        url: payload.url,
        icon: payload.icon,
        image: payload.image,
        badge: payload.badge,
        tag: payload.tag,
        data: payload.data,
        timestamp: new Date().toISOString()
      });

      const targetList = Array.from(rooms).join(', ');
      console.log(`📢 [NOTIFICATION] Emitting to: [${targetList}]. Payload:`, { title: payload.title, message: payload.message });
      console.log(`📢 [NOTIFICATION] Sent to [${targetList}]: ${payload.title}`);
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send notification:', error);
    }
  }

  /**
   * Helper to notify all admins.
   */
  public notifyAdmins(title: string, message: string, data?: any) {
    this.sendNotification({
      targets: ['admins'],
      title,
      message,
      data
    });
  }

  /**
   * Helper to notify a specific user.
   */
  public notifyUser(userId: string, title: string, message: string, data?: any) {
    this.sendNotification({
      targets: [`user_${userId}`],
      title,
      message,
      data
    });
  }
}

export const notificationService = new NotificationService();
