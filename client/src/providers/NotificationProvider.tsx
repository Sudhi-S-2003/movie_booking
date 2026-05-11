import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { notificationSocket } from '../services/socket/notification.socket.js';
import { useAuthStore } from '../store/authStore.js';
import { NotificationType } from '../constants/enums.js';
import { NotificationToast } from '../components/notifications/NotificationToast.js';

/**
 * PRODUCTION-GRADE NOTIFICATION ARCHITECTURE
 * 
 * Features:
 * 1. Stable Socket Lifecycle: Connection initializes once, safe cleanup, handles StrictMode correctly.
 * 2. Optimized Audio: Preloaded instance, reuse, 3-5s playback limit, autoplay unlock via user interaction.
 * 3. Intelligent Delivery: Native popups only when tab is hidden to avoid spam; always shows in-app toast.
 * 4. Reliable Unique Tags: Prevents browser from collapsing/replacing notifications by using unique identifiers.
 * 5. Memory-Safe Toasts: Stable timeout management with refs to prevent memory leaks during rapid updates.
 * 6. Security: Validates URLs and payload fields before action.
 */

// --- Types ---

export interface NotificationPayload {
  id?: string;
  title: string;
  message?: string;
  body?: string; // Fallback for standard notification body
  url?: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  type?: NotificationType;
  silent?: boolean;
  sound?: boolean;
}

interface Toast extends NotificationPayload {
  id: string;
  createdAt: number;
}

interface NotificationContextType {
  requestPermission: () => Promise<boolean>;
  permissionStatus: NotificationPermission;
  isSoundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  testNotification: () => void;
  showToast: (payload: Partial<NotificationPayload>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// --- Constants ---
const AUDIO_SRC = '/notification.mp3';
const FALLBACK_AUDIO_SRC = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const NOTIFICATION_DURATION = 8000;
const AUDIO_PLAYBACK_LIMIT = 3000; // 3 seconds maximum as requested

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  // --- State & Refs ---
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('notification_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSoundEnabledRef = useRef(isSoundEnabled);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const socketInitialized = useRef(false);
  const audioUnlocked = useRef(false);

  // Sync ref with state for use in async/socket callbacks to avoid stale closures
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  // --- Audio System ---

  // Preload audio instance once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const audio = new Audio(AUDIO_SRC);
    audio.preload = 'auto';
    audio.volume = 0.5;
    audioRef.current = audio;

    // Reliability: Handle loading errors with a verified CDN fallback
    audio.onerror = () => {
      console.warn('🔊 [NOTIFICATION] Primary audio failed to load, switching to fallback...');
      if (audioRef.current) audioRef.current.src = FALLBACK_AUDIO_SRC;
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!isSoundEnabledRef.current || !audioRef.current) return;

    try {
      const audio = audioRef.current;
      
      // Reset playback position for rapid-fire alerts
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // PRODUCTION REQUIREMENT: Enforce 3-second maximum duration
            setTimeout(() => {
              if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
              }
            }, AUDIO_PLAYBACK_LIMIT);
          })
          .catch(err => {
            // Autoplay restrictions are common; we handle them via the "prime" effect below
            console.warn('🔊 [NOTIFICATION] Playback restricted by browser policy:', err.message);
          });
      }
    } catch (error) {
      console.error('🔊 [NOTIFICATION] Audio playback failure:', error);
    }
  }, []);

  // Unlock audio context on first user interaction (Browser Compliance)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current || !audioRef.current) return;
      
      // Play and immediately pause to "warm up" the audio context
      audioRef.current.play()
        .then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          audioUnlocked.current = true;
          console.log('🔊 [NOTIFICATION] Audio context successfully unlocked');
          cleanup();
        })
        .catch(() => { /* Still locked; will retry on next interaction */ });
    };

    const cleanup = () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);

    return cleanup;
  }, []);

  // --- Notification Logic ---

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((payload: Partial<NotificationPayload>) => {
    const id = payload.id || crypto.randomUUID();
    const newToast: Toast = {
      ...payload,
      id,
      title: payload.title || 'System Notification',
      message: payload.message || payload.body || 'New update available.',
      createdAt: Date.now()
    };

    setToasts((prev) => [...prev, newToast]);

    // Memory-safe cleanup
    const timeout = setTimeout(() => {
      removeToast(id);
    }, NOTIFICATION_DURATION);

    timeoutsRef.current.set(id, timeout);
  }, [removeToast]);

  const handleIncomingNotification = useCallback((payload: NotificationPayload) => {
    if (!payload || typeof window === 'undefined') return;

    // DEFENSIVE: Ensure we have at least a title, otherwise the notification will fail/look broken
    const title = payload.title || 'New Notification';
    const body = payload.message || payload.body || '';
    
    console.group('🔔 [NOTIFICATION] Event Received');
    console.log('Payload:', payload);
    console.groupEnd();

    const isSilent = payload.silent === true || payload.sound === false;
    
    // Use a safe check for visibilityState (defaulting to hidden if somehow undefined to ensure delivery)
    const isTabVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : false;

    // 1. Play Audio (Logic: Play if sound enabled, regardless of visibility)
    if (!isSilent) {
      playNotificationSound();
    }

    // 2. Show In-App Toast (Always shown for seamless in-app experience)
    showToast({ ...payload, title, message: body });

    // 3. Browser Native Notification (ONLY if tab is NOT focused/visible)
    // We check both the permission state and the live Notification.permission value for maximum reliability
    const hasPermission = 'Notification' in window && 
                         (Notification.permission === 'granted' || permissionStatus === 'granted');

    if (!isTabVisible && hasPermission) {
      try {
        // Use UNIQUE tag to prevent replacement/collapsing by the browser
        // Providing a fallback UUID ensures the notification is ALWAYS treated as new if no ID exists
        const tag = payload.tag || payload.id || crypto.randomUUID();

        const notification = new Notification(title, {
          body,
          icon: payload.icon || '/logo.png',
          image: payload.image,
          badge: payload.badge,
          tag,
          requireInteraction: !!payload.url,
        } as any);

        if (payload.url) {
          notification.onclick = (e) => {
            e.preventDefault();
            
            try {
              window.focus();
              const targetUrl = payload.url || '';
              
              // PRODUCTION LOGIC: Use location.assign for reliable same-origin redirects
              // location.href can sometimes be blocked by strict policies if modified directly
              if (targetUrl.startsWith('/') || targetUrl.includes(window.location.host)) {
                window.location.assign(targetUrl);
              } else {
                const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                  console.warn('⚠️ [NOTIFICATION] Popup blocked by browser settings.');
                  // Fallback: Try redirecting the current tab if external link is critical
                  // window.location.assign(targetUrl);
                }
              }
            } catch (err) {
              console.error('❌ [NOTIFICATION] Navigation failed:', err);
            }
            
            notification.close();
          };
        }
      } catch (error) {
        console.error('❌ [NOTIFICATION] Native delivery failed:', error);
      }
    } else if (!isTabVisible && !hasPermission) {
      console.warn('⚠️ [NOTIFICATION] Browser notification suppressed: Missing permission.');
    }
  }, [playNotificationSound, showToast, permissionStatus]);

  // --- Socket Lifecycle ---

  useEffect(() => {
    // SINGLE INITIALIZATION: Prevent redundant connections in StrictMode or re-renders
    if (!socketInitialized.current) {
      notificationSocket.connect();
      socketInitialized.current = true;
      console.log('📡 [NOTIFICATION] Socket initialized');
    }

    // SAFE SUBSCRIPTION: One stable listener for the entire lifecycle
    const unsubscribe = notificationSocket.subscribe(handleIncomingNotification);

    return () => {
      unsubscribe();
      // We keep the socket alive during navigations; it only disconnects on page unmount if needed
    };
  }, [handleIncomingNotification]);

  // Handle Auth Transition: Refresh connection to ensure room membership (e.g. user-specific rooms)
  const { isAuthenticated, user } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('📡 [NOTIFICATION] Re-syncing socket for user session:', user.id);
      notificationSocket.disconnect();
      notificationSocket.connect();
    }
  }, [isAuthenticated, user?.id]);

  // --- External API ---

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    return permission === 'granted';
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setIsSoundEnabled(enabled);
    localStorage.setItem('notification_sound_enabled', String(enabled));
  }, []);

  const testNotification = useCallback(() => {
    handleIncomingNotification({
      id: crypto.randomUUID(),
      title: 'Reliability Test',
      message: 'If you see this, the production notification system is healthy.',
      type: NotificationType.SYSTEM,
      url: '/'
    });
  }, [handleIncomingNotification]);

  const contextValue = useMemo(() => ({
    requestPermission,
    permissionStatus,
    isSoundEnabled,
    setSoundEnabled,
    testNotification,
    showToast
  }), [requestPermission, permissionStatus, isSoundEnabled, setSoundEnabled, testNotification, showToast]);

  // --- Render ---

  return (
    <NotificationContext.Provider value={contextValue}>
      <div className="relative">
        {children}
        
        {/* Modern Responsive Toast UI Container */}
        <div className="fixed top-4 right-4 left-4 md:top-6 md:right-6 md:left-auto z-[9999] flex flex-col gap-3 pointer-events-none md:max-w-sm w-auto md:w-full">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => (
              <NotificationToast 
                key={toast.id} 
                toast={toast} 
                onRemove={removeToast} 
              />
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
