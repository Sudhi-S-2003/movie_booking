import { memo } from 'react';
import { TIER_COLORS, TIER_LABELS, PRICE_MAP } from './constants.js';

export const SeatLegend = memo(() => (
  <div className="mt-6 flex flex-wrap justify-center gap-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl py-4 px-6">
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 bg-transparent border-2 border-emerald-500/40 rounded-lg" />
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Available</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 bg-emerald-500 border-2 border-emerald-500 rounded-lg shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Selected</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 bg-white/[0.03] border-2 border-white/[0.04] rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-[130%] h-[1.5px] bg-white/10 rotate-45" /></div>
      </div>
      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Sold</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 bg-yellow-500/5 border-2 border-yellow-500/20 rounded-lg relative">
        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-500/60 animate-pulse" />
      </div>
      <span className="text-[10px] font-bold text-yellow-500/50 uppercase tracking-wider">Locked</span>
    </div>
    <div className="w-px h-5 bg-white/10 mx-2" />
    {Object.entries(TIER_LABELS).map(([key, label]) => (
      <div key={key} className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${TIER_COLORS[key]?.dot ?? ''}`} />
        <span className="text-[10px] font-bold text-gray-500">{label} — ₹{PRICE_MAP[key]}</span>
      </div>
    ))}
  </div>
));
SeatLegend.displayName = 'SeatLegend';
