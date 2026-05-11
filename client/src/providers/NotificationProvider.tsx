import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, ShieldAlert } from 'lucide-react';
import { notificationSocket } from '../services/socket/notification.socket.js';
import { useAuthStore } from '../store/authStore.js';
import { NotificationType } from '../constants/enums.js';

interface NotificationContextType {
  requestPermission: () => Promise<boolean>;
  isSoundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSoundEnabled, setIsSoundEnabled] = React.useState(() => {
    const saved = localStorage.getItem('notification_sound_enabled');
    return saved !== null ? saved === 'true' : true; // Default to true
  });
  const isSoundEnabledRef = useRef(isSoundEnabled);
  
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setIsSoundEnabled(enabled);
    localStorage.setItem('notification_sound_enabled', String(enabled));
  }, []);
  const [toasts, setToasts] = useState<any[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showBrowserNotification = useCallback((payload: any) => {
    const { title, message, url, icon, image, badge, tag, type } = payload;

    // 1. Try Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: icon || '/notification-icon.png',
        image: image,
        badge: badge,
        tag: tag || 'default',
        requireInteraction: !!url,
      } as any);

      if (url) {
        notification.onclick = (e) => {
          e.preventDefault();
          window.focus();
          window.location.href = url;
          notification.close();
        };
      }
      return;
    }

    // 2. Fallback to In-App Toast
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, url, type, icon }]);

    // Auto-remove after 6 seconds
    setTimeout(() => removeToast(id), 6000);
  }, [removeToast]);

  const playNotificationSound = useCallback(() => {
    try {
      // Try to load the local file first, with a fallback to a public CDN sound for testing
      const audio = new Audio('/notification.mp3');
      
      audio.volume = 0.5;
      audio.play().catch(err => {
        if (err.name === 'NotSupportedError' || err.message.includes('supported source')) {
          console.warn('🔊 [NOTIFICATION] Local /notification.mp3 not found. Please add it to client/public/');
        } else {
          console.warn('🔊 [NOTIFICATION] Playback blocked (needs user interaction):', err);
        }
      });
    } catch (error) {
      console.error('🔊 [NOTIFICATION] Sound error:', error);
    }
  }, []);

  const { isAuthenticated } = useAuthStore();

  // "Prime" the audio context on the first user interaction.
  // Browsers block audio playback until the user interacts with the page.
  useEffect(() => {
    const primeAudio = () => {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0; // Play silently to unlock
      audio.play()
        .then(() => {
          console.log('🔊 [NOTIFICATION] Audio context unlocked');
          cleanup();
        })
        .catch(() => {
          // If it still fails (e.g. file missing), we'll catch it in the actual playback
        });
    };

    const cleanup = () => {
      window.removeEventListener('click', primeAudio);
      window.removeEventListener('keydown', primeAudio);
      window.removeEventListener('touchstart', primeAudio);
    };

    window.addEventListener('click', primeAudio);
    window.addEventListener('keydown', primeAudio);
    window.addEventListener('touchstart', primeAudio);

    return cleanup;
  }, []);

  useEffect(() => {
    // Re-connect whenever auth state changes (e.g., guest -> user)
    // The connection service automatically picks up the latest token from store
    notificationSocket.disconnect();
    notificationSocket.connect();

    // Subscribe to events
    const unsubscribe = notificationSocket.subscribe((payload) => {
      console.log('🔔 [CLIENT] Notification Received!', payload);
      
      // Play sound unless explicitly silenced in the payload OR globally muted
      const isSilent = payload.silent === true || payload.sound === false;
      if (!isSilent && isSoundEnabledRef.current) {
        playNotificationSound();
      }

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

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const contextValue = useMemo(() => ({
    requestPermission,
    isSoundEnabled,
    setSoundEnabled
  }), [requestPermission, isSoundEnabled, setSoundEnabled]);

  return (
    <NotificationContext.Provider value={contextValue}>
      <div className="relative">
        {children}
        
        {/* In-App Toast Container */}
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
                className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4 overflow-hidden group relative"
              >
                {/* Accent line based on type */}
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  toast.type === NotificationType.SECURITY_ALERT ? 'bg-red-500' : 
                  toast.type === NotificationType.BOOKING_CONFIRMED ? 'bg-green-500' :
                  'bg-accent-blue'
                }`} />

                <div className="flex-shrink-0 mt-1">
                  {toast.type === NotificationType.SECURITY_ALERT ? (
                    <ShieldAlert className="text-red-500" size={20} />
                  ) : toast.type === NotificationType.SYSTEM ? (
                    <Info className="text-blue-500" size={20} />
                  ) : (
                    <Bell className={toast.type === NotificationType.BOOKING_CONFIRMED ? "text-green-500" : "text-accent-blue"} size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="text-sm font-bold text-white truncate mb-1">
                    {toast.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {toast.message}
                  </p>
                  
                  {toast.url && (
                    <button
                      onClick={() => window.location.href = toast.url}
                      className={`mt-3 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors ${
                        toast.type === NotificationType.SECURITY_ALERT ? 'text-red-500' : 'text-accent-blue'
                      }`}
                    >
                      View Details →
                    </button>
                  )}
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
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
