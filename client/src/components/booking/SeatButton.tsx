import { memo } from 'react';
import { getTierColor } from './constants.js';

interface SeatButtonProps {
  seatId: string;
  label: string;
  tier: string;
  isSelected: boolean;
  isBooked: boolean;
  isLockedByOther: boolean;
  onClick: (id: string) => void;
}

export const SeatButton = memo(({
  seatId,
  label,
  tier,
  isSelected,
  isBooked,
  isLockedByOther,
  onClick,
}: SeatButtonProps) => {
  const colors = getTierColor(tier);
  const disabled = isBooked || isLockedByOther;
  const isRecliner = tier === 'recliner' || tier === 'vip';

  return (
    <button
      disabled={disabled}
      onClick={() => !disabled && onClick(seatId)}
      className={`
        relative flex items-center justify-center font-black text-[10px] transition-all duration-200 select-none
        ${isRecliner ? 'w-11 h-10 rounded-xl' : 'w-9 h-9 rounded-lg'}
        border-2
        ${isSelected
          ? `${colors.selected} scale-105 z-10`
          : isBooked
            ? 'bg-white/[0.03] border-white/[0.04] text-white/10 cursor-not-allowed'
            : isLockedByOther
              ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500/30 cursor-not-allowed'
              : `bg-transparent ${colors.base} cursor-pointer hover:scale-110 active:scale-95`
        }
      `}
    >
      {label}
      {isBooked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[130%] h-[1.5px] bg-white/10 rotate-45" />
        </div>
      )}
      {isLockedByOther && (
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-500/60 animate-pulse" />
      )}
    </button>
  );
});
SeatButton.displayName = 'SeatButton';
