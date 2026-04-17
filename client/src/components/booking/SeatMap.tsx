import { memo, type RefObject } from 'react';
import { SeatButton } from './SeatButton.js';
import { SeatMinimap } from '../../pages/dashboards/owner/components/SeatMinimap.js';
import { TIER_LABELS, normalizeTier, getTierColor } from './constants.js';
import { SeatStatus } from '../../constants/enums.js';

interface TierSection {
  tier: string;
  rows: any[];
  price: number;
}

interface SeatMapProps {
  tierSections: TierSection[];
  screenLayout: any[];
  selectedSeats: { id: string; price: number }[];
  lockedSeats: Record<string, string>;
  zoom: number;
  onZoomChange: (fn: (prev: number) => number) => void;
  onSeatClick: (seatId: string) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export const SeatMap = memo(({
  tierSections,
  screenLayout,
  selectedSeats,
  lockedSeats,
  zoom,
  onZoomChange,
  onSeatClick,
  scrollRef,
}: SeatMapProps) => (
  <div className="relative bg-[#0a0a0c] border border-white/[0.04] rounded-3xl overflow-hidden">
    {}
    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-30 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1">
      <button onClick={() => onZoomChange(prev => Math.min(prev + 0.15, 1.8))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg font-bold transition-colors text-sm">+</button>
      <span className="text-[9px] font-black text-gray-500 min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
      <button onClick={() => onZoomChange(prev => Math.max(prev - 0.15, 0.5))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg font-bold transition-colors text-sm">−</button>
    </div>

    {}
    <div ref={scrollRef} className="overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
      <div
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        className="flex flex-col items-center min-w-max w-full px-10 pt-8 pb-6 transition-transform duration-200 ease-out"
      >
        {}
        <div className="mb-16 w-full flex flex-col items-center">
          <div className="w-[500px] h-2 bg-gradient-to-r from-transparent via-white/70 to-transparent rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)]" />
          <p className="mt-5 text-[9px] tracking-[0.5em] text-gray-600 font-black uppercase">All eyes this way please</p>
          <div className="w-[600px] h-[120px] bg-gradient-to-b from-white/[0.02] to-transparent rounded-b-[50%] pointer-events-none" />
        </div>

        {}
        {tierSections.map((section, sIdx) => {
          const colors = getTierColor(section.tier);
          return (
            <div key={sIdx} className="w-full flex flex-col items-center mb-6">
              {}
              <div className="flex items-center gap-3 mb-4 w-full max-w-[800px]">
                <div className="flex-1 h-px bg-white/[0.04]" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${colors.label}`}>
                    {TIER_LABELS[section.tier] || section.tier}
                  </span>
                  <span className="text-[9px] font-bold text-gray-600">₹{section.price}</span>
                </div>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>

              {}
              <div className="space-y-2.5">
                {section.rows.map((row) => (
                  <div key={`row-${row.name}`} className="flex items-center gap-4">
                    <span className="w-7 text-[10px] font-black text-gray-600 text-center">{row.name}</span>
                    <div className="flex gap-2">
                      {row.columns.map((col: any, colIdx: number) => {
                        if (col.type === 'space') return <div key={`gap-${colIdx}`} className="w-6" />;

                        const seatId = `${row.name}-${col.name}`;
                        const isSelected = selectedSeats.some(s => s.id === seatId);
                        const status = lockedSeats[seatId] || SeatStatus.AVAILABLE;
                        const isBooked = status === SeatStatus.BOOKED;
                        const isLockedByOther = status === SeatStatus.LOCKED && !isSelected;
                        const tier = normalizeTier(col.priceGroup);

                        return (
                          <SeatButton
                            key={seatId}
                            seatId={seatId}
                            label={col.name}
                            tier={tier}
                            isSelected={isSelected}
                            isBooked={isBooked}
                            isLockedByOther={isLockedByOther}
                            onClick={onSeatClick}
                          />
                        );
                      })}
                    </div>
                    <span className="w-7 text-[10px] font-black text-gray-600 text-center">{row.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {}
    {screenLayout && (
      <div className="absolute bottom-4 right-4 z-20">
        <SeatMinimap rows={screenLayout} scrollRef={scrollRef} />
      </div>
    )}
  </div>
));
SeatMap.displayName = 'SeatMap';
