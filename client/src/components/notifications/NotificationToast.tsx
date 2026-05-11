import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Bell, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { NotificationType } from '../../constants/enums.js';

interface NotificationToastProps {
  toast: {
    id: string;
    title: string;
    message?: string;
    url?: string;
    type?: NotificationType;
  };
  onRemove: (id: string) => void;
}

export const NotificationToast = React.memo(({ toast, onRemove }: NotificationToastProps) => {
  const [progress, setProgress] = useState(100);
  const duration = 8000; // Match NOTIFICATION_DURATION

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleAction = () => {
    if (!toast.url) return;

    try {
      const targetUrl = toast.url;

      // PRODUCTION LOGIC: Use location.assign for reliable same-origin redirects
      if (targetUrl.startsWith('/') || targetUrl.includes(window.location.host)) {
        window.location.assign(targetUrl);
      } else {
        const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn('⚠️ [NOTIFICATION] External popup blocked. Falling back to current tab.');
          // Fallback if critical, otherwise just log the block
          // window.location.assign(targetUrl);
        }
      }
    } catch (err) {
      console.error('❌ [NOTIFICATION] Action navigation failed:', err);
    }
  };

  const getThemeColor = () => {
    switch (toast.type) {
      case NotificationType.SECURITY_ALERT: return 'red';
      case NotificationType.BOOKING_CONFIRMED: return 'emerald';
      default: return 'blue';
    }
  };

  const theme = getThemeColor();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, y: -20, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.01 }}
      className="pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-slate-900/80 p-4 md:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:border-white/20"
    >
      {/* Background Glow */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl ${
        theme === 'red' ? 'bg-red-500' : theme === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
      }`} />

      <div className="relative flex items-start gap-4">
        {/* Icon with Ring */}
        <div className="relative flex-shrink-0">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
            theme === 'red' ? 'border-red-500/30 bg-red-500/10' : 
            theme === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/10' : 
            'border-blue-500/30 bg-blue-500/10'
          }`}>
            {toast.type === NotificationType.SECURITY_ALERT ? (
              <ShieldAlert className="text-red-400" size={24} />
            ) : toast.type === NotificationType.BOOKING_CONFIRMED ? (
              <CheckCircle2 className="text-emerald-400" size={24} />
            ) : (
              <Bell className="text-blue-400" size={24} />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold tracking-tight text-white line-clamp-1">
              {toast.title}
            </h4>
            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
              Just now
            </span>
          </div>
          
          <p className="mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2">
            {toast.message}
          </p>
          
          {toast.url && (
            <button
              onClick={handleAction}
              className={`group/btn mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                theme === 'red' ? 'text-red-400 hover:text-red-300' : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              Take Action
              <ArrowRight size={12} className="transition-transform group-hover/btn:translate-x-1" />
            </button>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 rounded-xl p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress Bar Container */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-white/5">
        <motion.div
          className={`h-full opacity-60 ${
            theme === 'red' ? 'bg-red-500' : theme === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
        />
      </div>
    </motion.div>
  );
});

NotificationToast.displayName = 'NotificationToast';
