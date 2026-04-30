import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AtSign, Keyboard } from 'lucide-react';

interface UsernameSuggestionsProps {
  suggestions: string[];
  onSelect: (username: string) => void;
}

export const UsernameSuggestions = ({ suggestions, onSelect }: UsernameSuggestionsProps) => {
  // Render nothing if the prop was never set (e.g. error was not a username conflict)
  if (!suggestions) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-accent-blue/20 bg-accent-blue/5 p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent-blue" />
          <p className="text-[11px] font-black uppercase tracking-widest text-accent-blue">
            Available usernames
          </p>
        </div>

        {/* Empty state — server returned no free slots */}
        {suggestions.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Keyboard size={13} />
            <p className="text-[11px] font-bold">
              No suggestions available — try a different username.
            </p>
          </div>
        ) : (
          /* Chips — backend already shuffled, just render */
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={suggestion}
                type="button"
                onClick={() => onSelect(suggestion)}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10
                           text-xs font-bold text-white hover:bg-accent-blue/20 hover:border-accent-blue/40
                           transition-colors cursor-pointer group"
              >
                <AtSign
                  size={11}
                  className="text-gray-500 group-hover:text-accent-blue transition-colors"
                />
                {suggestion}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
