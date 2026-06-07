import { useCallback } from 'react';
import { useNotificationStore } from '../store/notificationStore.js';
import type { NotificationPayload } from '../types/notification.js';

export const useBrowserNotification = () => {
  const permissionStatus = useNotificationStore(state => state.permissionStatus);
  const setPermissionStatus = useNotificationStore(state => state.setPermissionStatus);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    return permission === 'granted';
  }, [setPermissionStatus]);

  const showBrowserNotification = useCallback((payload: NotificationPayload, title: string, body: string) => {
    // We check both the permission state and the live Notification.permission value for maximum reliability
    const hasPermission = 'Notification' in window && 
                         (Notification.permission === 'granted' || permissionStatus === 'granted');

    if (!hasPermission) {
      console.warn('⚠️ [NOTIFICATION] Browser notification suppressed: Missing permission.');
      return;
    }

    try {
      // Use UNIQUE tag to prevent replacement/collapsing by the browser
      const tag = payload.tag || payload.id || crypto.randomUUID();

      const notification = new Notification(title, {
        body,
        icon: payload.icon || '/logo.png',
        image: payload.image,
        badge: payload.badge,
        tag,
      } as any);

      notification.onclick = (e) => {
        e.preventDefault();
        try {
          window.focus();
        } catch (err) {
          console.error('❌ [NOTIFICATION] Window focus failed:', err);
        }
        notification.close();
      };
    } catch (error) {
      console.error('❌ [NOTIFICATION] Native delivery failed:', error);
    }
  }, [permissionStatus]);

  return { requestPermission, showBrowserNotification, permissionStatus };
};
