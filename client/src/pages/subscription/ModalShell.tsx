import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export const ModalShell = ({
  onClose, heading, subheading, accent, children,
}: {
  onClose: () => void;
  heading: string;
  subheading: string;
  accent: 'pink' | 'emerald' | 'blue';
  children: React.ReactNode;
}) => {
  const accentBar =
    accent === 'pink'    ? 'bg-accent-pink' :
    accent === 'emerald' ? 'bg-emerald-400' :
                           'bg-accent-blue';
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-[#0c0c0c] border border-white/[0.1] rounded-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <div className={`h-[3px] w-full ${accentBar} opacity-80 sticky top-0 z-10`} />
        <div className="p-5 sm:p-6">
          <button onClick={onClose} aria-label="Close" className="absolute top-2 right-2 sm:top-3 sm:right-3 w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
          <h2 className="text-xl font-black text-white">{heading}</h2>
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{subheading}</p>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};
