import { AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../../store/notificationStore.js';
import { NotificationToast } from './NotificationToast.js';
import { useNotificationSocket } from '../../hooks/useNotificationSocket.js';

/**
 * Root component for the notification system.
 * It mounts the socket hooks and renders the toast container.
 * Place this component at the top level of your app (e.g. in App.tsx).
 */
export const NotificationRoot = () => {
  // Initialize the socket subscription and audio/browser hooks
  useNotificationSocket();

  // It's a good practice to optionally request permissions or just let the app logic call it when needed.
  // In this design, we expose it via the hook `useBrowserNotification` or we can let specific components (like NotificationSetup) call it.

  const toasts = useNotificationStore((state) => state.toasts);
  const removeToast = useNotificationStore((state) => state.removeToast);

  return (
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
  );
};
