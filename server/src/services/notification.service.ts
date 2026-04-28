import { getIO } from '../socket/index.js';
import { UserRole, NotificationType } from '../constants/enums.js';

export type NotificationTarget = 'all' | 'guests' | 'authenticated' | 'admins' | 'owners' | `user:${string}`;

interface NotificationPayload {
  targets?: NotificationTarget[] | undefined;
  userIds?: string[] | undefined;    // New: send to specific raw user IDs
  type?: NotificationType | undefined;       // Dedicated type for frontend checks
  title: string;
  message: string;
  url?: string | undefined;       // Dynamic link to navigate to on click
  icon?: string | undefined;      // Override icon
  image?: string | undefined;     // Large banner image
  badge?: string | undefined;     // Small status bar icon (mobile)
  tag?: string | undefined;       // Notification grouping ID
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
        payload.userIds.forEach(id => rooms.add(`user:${id}`));
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
        type: payload.type,
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
  public notifyUser(userId: string, title: string, message: string, data?: any, type?: NotificationType) {
    this.sendNotification({
      targets: [`user:${userId}`],
      title,
      message,
      data,
      type
    });
  }
}

export const notificationService = new NotificationService();
