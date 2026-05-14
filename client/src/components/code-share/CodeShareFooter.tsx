import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface CodeShareFooterProps {
  isFetchingNextPage: boolean;
  length: number;
  totalLength?: number;
}

export const CodeShareFooter: React.FC<CodeShareFooterProps> = ({
  isFetchingNextPage,
  length,
  totalLength
}) => {
  return (
    <footer className="px-6 py-2 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-[11px] font-medium">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isFetchingNextPage ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-zinc-400 uppercase tracking-tight">
            {isFetchingNextPage ? 'Syncing...' : 'Connected'}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">{length.toLocaleString()}</span>
            <span>/</span>
            <span>{totalLength?.toLocaleString() || '--'} bytes</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">{((length / (totalLength || 1)) * 100).toFixed(0)}%</span>
            <span>loaded</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <ShieldCheck size={12} />
          <span className="text-[10px] font-bold uppercase tracking-wide">Secure</span>
        </div>
        
        <div className="flex items-center gap-2 text-zinc-600">
          <span>v1.2.0</span>
        </div>
      </div>
    </footer>
  );
};
