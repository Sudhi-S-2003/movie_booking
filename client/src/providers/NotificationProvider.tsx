import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { notificationSocket } from '../services/socket/notification.socket.js';
import { useAuthStore } from '../store/authStore.js';
import { NotificationType } from '../constants/enums.js';

interface NotificationContextType {
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  
  const showBrowserNotification = useCallback((payload: any) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const { title, message, url, icon, image, badge, tag, type } = payload;
      
      const notification = new Notification(title, {
        body: message,
        icon: icon || '/notification-icon.png',
        image: image,
        badge: badge,
        tag: tag || 'default',
        requireInteraction: !!url, // Keep it visible if it has a link
      } as any);

      if (url) {
        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          window.location.href = url; // Or use navigate if we can access it
          notification.close();
        };
      }
    }
  }, []);

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Re-connect whenever auth state changes (e.g., guest -> user)
    // The connection service automatically picks up the latest token from store
    notificationSocket.disconnect();
    notificationSocket.connect();

    // Subscribe to events
    const unsubscribe = notificationSocket.subscribe((payload) => {
      console.log('🔔 [CLIENT] Notification Received!', payload);
      
      // Dedicated type check for frontend logic
      if (payload.type === NotificationType.SECURITY_ALERT) {
        console.log(`🛡️ [SECURITY] Critical alert received: ${payload.title}`);
        // Add custom security handling here
      } else if (payload.type) {
        console.log(`📡 [NOTIFICATION] Handling specific type: ${payload.type}`);
      }

      showBrowserNotification(payload);
    });

    return () => {
      unsubscribe();
      notificationSocket.disconnect();
    };
  }, [showBrowserNotification, isAuthenticated]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  return (
    <NotificationContext.Provider value={{ requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
