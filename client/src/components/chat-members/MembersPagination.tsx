import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildPageWindow } from './utils/pageWindow.js';

type Size = 'lg' | 'sm';

interface MembersPaginationProps {
  page:       number;
  totalPages: number;
  /** Disable all controls (e.g. while a load is in flight). */
  disabled?:  boolean;
  /** Called with the new page number when the user clicks a control. */
  onChange:   (next: number) => void;
  /** Visual size — `lg` for the main list footer, `sm` for the in-modal variant. */
  size?:      Size;
}

const STYLES = {
  lg: {
    btn:   'w-10 h-10 rounded-xl text-[11px]',
    gap:   'px-2 text-gray-600',
    iconSz: 16,
  },
  sm: {
    btn:   'w-7 h-7 rounded-md text-[10px]',
    gap:   'px-1 text-[9px] text-white/20',
    iconSz: 12,
  },
} as const;

/**
 * Shared pagination control with a collapsed "1 … 5 6 7 … 20" window.
 * Used by the main members list and the Add Members modal's search results.
 */
export const MembersPagination = memo(({
  page,
  totalPages,
  disabled = false,
  onChange,
  size = 'lg',
}: MembersPaginationProps) => {
  if (totalPages <= 1) return null;

  const { btn, gap, iconSz } = STYLES[size];
  const window = buildPageWindow(page, totalPages);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        className={`${btn} bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Previous page"
      >
        <ChevronLeft size={iconSz} />
      </button>

      {window.map((slot, i) =>
        slot === '…' ? (
          <span key={`gap-${i}`} className={`${gap} font-black`}>…</span>
        ) : (
          <button
            key={slot}
            onClick={() => onChange(slot)}
            disabled={disabled}
            className={`${btn} font-black tracking-tight transition-all ${
              slot === page
                ? 'bg-accent-blue/20 border border-accent-blue/40 text-accent-blue'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {slot}
          </button>
        ),
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className={`${btn} bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Next page"
      >
        <ChevronRight size={iconSz} />
      </button>
    </div>
  );
});

MembersPagination.displayName = 'MembersPagination';
