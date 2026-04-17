import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  users: Array<{ userId: string; name: string }>;
}

export const TypingIndicator = memo(({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const label =
    users.length === 1
      ? `${users[0]!.name} is typing`
      : users.length === 2
        ? `${users[0]!.name} and ${users[1]!.name} are typing`
        : `${users[0]!.name} and ${users.length - 1} others are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-2 px-4 py-1.5"
      >
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/30"
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration:  0.6,
                repeat:    Infinity,
                delay:     i * 0.15,
                ease:      'easeInOut',
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-white/30 font-medium">{label}</span>
      </motion.div>
    </AnimatePresence>
  );
});

TypingIndicator.displayName = 'TypingIndicator';
