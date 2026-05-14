import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface CodeShareErrorProps {
  message: string;
}

export const CodeShareError: React.FC<CodeShareErrorProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 z-[100]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-rose-500/[0.03] blur-[150px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-[#0c0c0c] border border-rose-500/20 rounded-[2.5rem] p-10 text-center shadow-2xl relative z-10"
      >
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <div className="absolute inset-0 rounded-full border border-rose-500/20 animate-ping opacity-20" />
          <ShieldAlert className="text-rose-400" size={48} />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Security Alert</h2>
        <div className="px-6 py-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl mb-8">
          <p className="text-rose-200/60 text-[11px] font-bold leading-relaxed uppercase tracking-wider">{message}</p>
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          className="w-full py-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <AlertCircle size={14} />
          Return to Safety
        </button>
      </motion.div>
    </div>
  );
};
