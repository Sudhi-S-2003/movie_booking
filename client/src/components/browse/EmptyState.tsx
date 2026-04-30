import { Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  message: string;
  onReset: () => void;
  resetLabel?: string;
}

export const EmptyState = ({ message, onReset, resetLabel = 'Reset filters' }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-32 bg-white/5 rounded-[80px] border border-dashed border-white/10 flex flex-col items-center"
  >
    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700 mb-6">
      <Info size={36} />
    </div>
    <p className="text-gray-500 font-black text-xl italic opacity-50">{message}</p>
    <button
      onClick={onReset}
      className="mt-8 text-accent-pink font-black uppercase text-[10px] tracking-widest hover:underline"
    >
      {resetLabel}
    </button>
  </motion.div>
);
