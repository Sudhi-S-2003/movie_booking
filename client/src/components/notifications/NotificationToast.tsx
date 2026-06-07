import React from 'react';
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
  const handleAction = () => {
    if (!toast.url) return;

    try {
      const targetUrl = toast.url;
      window.location.href = targetUrl;
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
      className="pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:border-white/20"
    >
      {/* Background Glow */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl ${
        theme === 'red' ? 'bg-rose-500' : theme === 'emerald' ? 'bg-emerald-500' : 'bg-accent-blue'
      }`} />

      <div className="relative flex items-start gap-4">
        {/* Icon with Ring */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            theme === 'red' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 
            theme === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 
            'border-accent-blue/30 bg-accent-blue/10 text-accent-blue'
          }`}>
            {toast.type === NotificationType.SECURITY_ALERT ? (
              <ShieldAlert size={20} />
            ) : toast.type === NotificationType.BOOKING_CONFIRMED ? (
              <CheckCircle2 size={20} />
            ) : (
              <Bell size={20} />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white line-clamp-1 mt-1">
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
              className={`group/btn mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                theme === 'red' ? 'text-rose-400 hover:text-rose-300' : 'text-accent-blue hover:text-blue-300'
              }`}
            >
              Take Action
              <ArrowRight size={12} className="transition-transform group-hover/btn:translate-x-1" />
            </button>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar Container */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-white/5">
        <motion.div
          className={`h-full opacity-60 ${
            theme === 'red' ? 'bg-rose-500' : theme === 'emerald' ? 'bg-emerald-500' : 'bg-accent-blue'
          }`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 8, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
});

NotificationToast.displayName = 'NotificationToast';
