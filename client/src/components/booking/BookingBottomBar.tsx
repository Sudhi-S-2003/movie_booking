import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Armchair } from 'lucide-react';

interface BookingBottomBarProps {
  selectedSeats: { id: string; price: number }[];
  totalPrice: number;
  timeLeft: number;
  formatTime: (s: number) => string;
  onClear: () => void;
  onProceed: () => void;
}

export const BookingBottomBar = memo(({ selectedSeats, totalPrice, timeLeft, formatTime, onClear, onProceed }: BookingBottomBarProps) => (
  <AnimatePresence>
    {selectedSeats.length > 0 && (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 w-full z-50 p-4 pb-6"
      >
        <div className="max-w-5xl mx-auto bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-pink/10 border border-accent-pink/20 rounded-xl">
                <Timer size={14} className="text-accent-pink animate-pulse" />
                <span className="text-sm font-black tabular-nums text-accent-pink">{formatTime(timeLeft)}</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">₹{totalPrice}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold mt-0.5 truncate max-w-[300px]">
                  {selectedSeats.map(s => s.id).join(' · ')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={onClear}
                className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-sm transition-all"
              >
                Clear
              </button>
              <button
                onClick={onProceed}
                className="flex-1 md:flex-none px-12 py-3.5 bg-accent-pink hover:bg-accent-pink/90 rounded-xl font-black text-sm transition-all shadow-lg shadow-accent-pink/20 hover:shadow-accent-pink/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Armchair size={16} />
                Pay ₹{totalPrice}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
));
BookingBottomBar.displayName = 'BookingBottomBar';
