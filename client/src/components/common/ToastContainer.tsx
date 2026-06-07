import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import React from 'react';
import { useToastStore } from '../../store/toastStore.js';

export const ToastContainer = React.memo(() => {
  const toasts = useToastStore(state => state.toasts);
  const removeToast = useToastStore(state => state.removeToast);

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';
          const isLoading = toast.type === 'loading';
          
          return (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="pointer-events-auto relative flex items-center gap-3 px-5 py-3.5 rounded-2xl md:rounded-3xl border border-white/10 bg-slate-900/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:border-white/20 min-w-[300px] max-w-sm overflow-hidden"
          >
            {/* Subtle background glow based on type */}
            <div className={`absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 blur-3xl ${
              isSuccess ? 'bg-emerald-500' : 
              isError ? 'bg-rose-500' : 
              isLoading ? 'bg-accent-purple' : 'bg-accent-blue'
            }`} />

            <div className={`flex items-center justify-center h-8 w-8 rounded-xl border flex-shrink-0 ${
              isSuccess ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
              isError ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' :
              isLoading ? 'border-accent-purple/30 bg-accent-purple/10 text-accent-purple' :
              'border-accent-blue/30 bg-accent-blue/10 text-accent-blue'
            }`}>
              {isSuccess && <CheckCircle2 size={16} />}
              {isError && <AlertCircle size={16} />}
              {isInfo && <Info size={16} />}
              {isLoading && <Loader2 size={16} className="animate-spin" />}
            </div>
            
            <p className="flex-1 text-[11px] font-bold uppercase tracking-widest text-white mt-0.5">{toast.message}</p>
            
            {!isLoading && (
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        )})}
      </AnimatePresence>
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';
