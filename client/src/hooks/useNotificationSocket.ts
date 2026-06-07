import { useEffect, useRef, useCallback } from 'react';
import { notificationSocket } from '../services/socket/notification.socket.js';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import type { NotificationPayload } from '../types/notification.js';
import { useNotificationAudio } from './useNotificationAudio.js';
import { useBrowserNotification } from './useBrowserNotification.js';

export const useNotificationSocket = () => {
  const socketInitialized = useRef(false);
  const showToast = useNotificationStore(state => state.showToast);
  const { playNotificationSound } = useNotificationAudio();
  const { showBrowserNotification } = useBrowserNotification();

  const handleIncomingNotification = useCallback((payload: NotificationPayload) => {
    if (!payload || typeof window === 'undefined') return;

    const title = payload.title || 'New Notification';
    const body = payload.message || payload.body || '';
    
    console.group('🔔 [NOTIFICATION] Event Received');
    console.log('Payload:', payload);
    console.groupEnd();

    const isSilent = payload.silent === true || payload.sound === false;
    const isTabVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : false;

    // 1. Play Audio
    if (!isSilent) {
      playNotificationSound();
    }

    // 2. Show In-App Toast
    showToast({ ...payload, title, message: body });

    // 3. Browser Native Notification (only if tab hidden)
    if (!isTabVisible) {
      showBrowserNotification(payload, title, body);
    }
  }, [playNotificationSound, showToast, showBrowserNotification]);

  useEffect(() => {
    if (!socketInitialized.current) {
      notificationSocket.connect();
      socketInitialized.current = true;
      console.log('📡 [NOTIFICATION] Socket initialized');
    }

    const unsubscribe = notificationSocket.subscribe(handleIncomingNotification);

    // Aggressive Reconnection Strategy for Background/Sleeping Tabs
    const handleWakeUp = () => {
      // If the browser froze the tab and dropped the connection in the background, force a reconnect instantly
      if (!notificationSocket.isConnected) {
        console.log('📡 [NOTIFICATION] Waking up from background - forcing socket reconnect');
        notificationSocket.connect();
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleWakeUp();
    });
    window.addEventListener('online', handleWakeUp);

    return () => {
      unsubscribe();
      window.removeEventListener('visibilitychange', handleWakeUp);
      window.removeEventListener('online', handleWakeUp);
    };
  }, [handleIncomingNotification]);

  // Handle Auth Transition
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userId = useAuthStore(state => state.user?.id);

  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('📡 [NOTIFICATION] Re-syncing socket for user session:', userId);
      notificationSocket.disconnect();
      notificationSocket.connect();
    }
  }, [isAuthenticated, userId]);
};
