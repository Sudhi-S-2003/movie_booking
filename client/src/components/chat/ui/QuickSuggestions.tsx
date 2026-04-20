import React, { memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { getAvailablePlatforms, getSocialMeta } from '../../../utils/social-resolver.js';

interface QuickSuggestionsProps {
  onSelect: (prefix: string) => void;
  onClose:  () => void;
}

/**
 * A floating menu that allows quick insertion of social mention prefixes.
 * Slides up from the composer.
 */
export const QuickSuggestions = memo(({ onSelect, onClose }: QuickSuggestionsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const platforms = getAvailablePlatforms();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="
        z-50
        max-[640px]:fixed max-[640px]:inset-x-0 max-[640px]:bottom-0
        sm:absolute sm:bottom-full sm:left-0 sm:mb-2 sm:min-w-[200px]
      "
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="
          bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/[0.08]
          overflow-hidden shadow-2xl shadow-black/50 p-2
          max-[640px]:rounded-t-3xl max-[640px]:border-t-0 max-[640px]:max-h-[70dvh] max-[640px]:overflow-y-auto
          sm:rounded-2xl
        "
      >
        <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Quick Suggestions
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {platforms.map((p) => {
            const meta = getSocialMeta(`@${p}:user`); // Dummy to get icon/color
            if (!meta) return null;
            const Icon = (LucideIcons as any)[meta.iconName] || LucideIcons.Globe;

            return (
              <button
                key={p}
                onClick={() => {
                  onSelect(`@${p}:`);
                  onClose();
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-all group text-left"
              >
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-inner shadow-black/20"
                  style={{ backgroundColor: `${meta.color}15` }}
                >
                  <Icon size={14} style={{ color: meta.color }} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold block">{meta.displayName}</span>
                  <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">
                    Click to insert @{p}:
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
});

QuickSuggestions.displayName = 'QuickSuggestions';
