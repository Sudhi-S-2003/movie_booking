import React from 'react';
import { motion } from 'framer-motion';

export const CodeShareLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-[100] gap-8">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-white/5 border-t-accent-blue rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-accent-blue/20 border-b-accent-blue rounded-full animate-spin-reverse" style={{ animationDirection: 'reverse' }} />
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px]"
        >
          Decrypting Stream
        </motion.h2>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0.2 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              className="w-1 h-1 bg-accent-blue rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
