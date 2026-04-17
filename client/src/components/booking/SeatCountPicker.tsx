import { memo } from 'react';

interface SeatCountPickerProps {
  seatCount: number | null;
  selectedCount: number;
  onCountChange: (n: number) => void;
}

export const SeatCountPicker = memo(({ seatCount, selectedCount, onCountChange }: SeatCountPickerProps) => (
  <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-5 py-3">
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">How Many Seats?</span>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        const isActive = seatCount === n;
        const isFilled = selectedCount === n && seatCount === n;
        return (
          <button
            key={n}
            onClick={() => onCountChange(n)}
            className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
              isActive
                ? isFilled
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : 'bg-accent-pink text-white shadow-lg shadow-accent-pink/30 scale-105'
                : 'bg-white/[0.04] text-gray-500 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
    {seatCount !== null && (
      <span className="text-[10px] font-bold text-gray-600 ml-2">
        {selectedCount}/{seatCount} selected
      </span>
    )}
  </div>
));
SeatCountPicker.displayName = 'SeatCountPicker';
