import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Toast, NotificationPayload } from '../types/notification.js';

interface NotificationState {
  toasts: Toast[];
  isSoundEnabled: boolean;
  permissionStatus: NotificationPermission;
  setSoundEnabled: (enabled: boolean) => void;
  setPermissionStatus: (status: NotificationPermission) => void;
  showToast: (payload: Partial<NotificationPayload>) => void;
  removeToast: (id: string) => void;
}

const NOTIFICATION_DURATION = 8000;
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      toasts: [],
      isSoundEnabled: true,
      permissionStatus: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
      
      setSoundEnabled: (enabled) => set({ isSoundEnabled: enabled }),
      
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      
      showToast: (payload) => {
        const id = payload.id || crypto.randomUUID();
        const newToast: Toast = {
          ...payload,
          id,
          title: payload.title || 'System Notification',
          message: payload.message || payload.body || 'New update available.',
          createdAt: Date.now()
        };

        set((state) => ({ toasts: [...state.toasts, newToast] }));

        // Memory-safe cleanup
        const timeout = setTimeout(() => {
          get().removeToast(id);
        }, NOTIFICATION_DURATION);

        timeouts.set(id, timeout);
      },
      
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        if (timeouts.has(id)) {
          clearTimeout(timeouts.get(id));
          timeouts.delete(id);
        }
      }
    }),
    {
      name: 'notification_sound_enabled', // Match previous localStorage key for backward compatibility if possible, though previous was just a boolean string
      partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled })
    }
  )
);
