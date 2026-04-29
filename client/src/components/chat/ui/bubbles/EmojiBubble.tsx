import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * 1. Define Universal Animation Variants
 */
const emojiVariants = {
  throb: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
  },
  shake: {
    y: [0, -6, 0],
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 1 }
  },
  flicker: {
    opacity: [1, 0.8, 1],
    scale: [1, 1.05, 0.95, 1],
    transition: { duration: 1.2, repeat: Infinity }
  },
  pop: {
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 }
  }
};

/**
 * 2. Logic to assign animations to ALL emojis
 */
const getAnimationForEmoji = (emoji: string) => {
  if (!emoji) return {};
  
  // Get the first code point (handles most complex emojis)
  const codePoint = emoji.codePointAt(0) || 0;

  // Category: Hearts (Throb)
  if ((codePoint >= 0x1F490 && codePoint <= 0x1F49F) || codePoint === 0x2764) {
    return emojiVariants.throb;
  }

  // Category: Faces & People (Shake)
  if (codePoint >= 0x1F600 && codePoint <= 0x1F64F) {
    return emojiVariants.shake;
  }

  // Category: Nature & Weather (Flicker)
  if (codePoint >= 0x1F300 && codePoint <= 0x1F32C) {
    return emojiVariants.flicker;
  }

  // FALLBACK: Deterministic Hashing
  // If the emoji doesn't fit a category, assign one based on its unique character code.
  // This ensures 🍕 always behaves the same way, but you don't have to code it.
  const variants = Object.values(emojiVariants);
  const hash = emoji.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return variants[hash % variants.length];
};

interface EmojiBubbleProps {
  msg: {
    text?: string;
    emoji?: string;
  };
}

export const EmojiBubble = memo(({ msg }: EmojiBubbleProps) => {
  const glyph = (msg.emoji || msg.text || '').trim();

  // useMemo prevents recalculating the animation object on every re-render
  const loopAnimation = useMemo(() => getAnimationForEmoji(glyph), [glyph]);

  return (
    <div className="flex items-center justify-center p-4 leading-none select-none overflow-hidden">
      <motion.span
        role="img"
        aria-label="emoji"
        className="inline-block text-6xl drop-shadow-xl will-change-transform cursor-default"
        
        // 1. Entrance Animation
        initial={{ scale: 0, opacity: 0, rotate: -30 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          rotate: 0,
          ...loopAnimation // 2. Dynamic Loop Animation
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 20 
        }}
      >
        {glyph}
      </motion.span>
    </div>
  );
});

EmojiBubble.displayName = 'EmojiBubble';
