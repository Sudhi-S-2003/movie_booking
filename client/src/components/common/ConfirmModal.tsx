import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) => {
  // Theme selection based on type
  const theme = {
    danger: {
      icon: <Trash2 size={24} className="text-rose-400" />,
      bgGlow: 'bg-rose-500',
      iconBox: 'border-rose-500/30 bg-rose-500/10',
      btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]',
    },
    warning: {
      icon: <AlertTriangle size={24} className="text-amber-400" />,
      bgGlow: 'bg-amber-500',
      iconBox: 'border-amber-500/30 bg-amber-500/10',
      btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]',
    },
    info: {
      icon: <Info size={24} className="text-accent-blue" />,
      bgGlow: 'bg-accent-blue',
      iconBox: 'border-accent-blue/30 bg-accent-blue/10',
      btnConfirm: 'bg-accent-blue hover:bg-blue-600 text-white shadow-[0_0_15px_rgba(31,182,255,0.4)]',
    },
  }[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/90 p-6 shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            {/* Ambient Background Glow */}
            <div className={`absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-20 blur-[50px] ${theme.bgGlow}`} />

            {/* Close Button */}
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            )}

            <div className="flex flex-col items-center text-center">
              {/* Icon Container */}
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border ${theme.iconBox}`}>
                {theme.icon}
              </div>

              {/* Text Content */}
              <h3 className="mb-2 text-xl font-bold tracking-tight text-white">{title}</h3>
              <p className="mb-8 text-sm leading-relaxed text-slate-400">
                {message}
              </p>

              {/* Action Buttons */}
              <div className="flex w-full gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${theme.btnConfirm}`}
                >
                  {isLoading ? 'Processing...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
