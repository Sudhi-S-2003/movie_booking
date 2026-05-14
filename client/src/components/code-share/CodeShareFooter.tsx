import React from 'react';
import { Cpu, Terminal, ShieldCheck, Fingerprint } from 'lucide-react';

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
    <footer className="px-8 py-4 border-t border-white/[0.06] bg-[#0c0c0c]/60 backdrop-blur-3xl flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu size={12} className="text-accent-blue/40" />
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
              {isFetchingNextPage ? 'Syncing...' : 'Stream Active'}
            </span>
          </div>
          <div className="w-[1px] h-3 bg-white/5" />
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-white/10" />
            <span className="text-[10px] font-bold text-white/30 tracking-widest font-mono">
              {length.toLocaleString()} {totalLength ? `/ ${totalLength.toLocaleString()}` : ''} BYTES
            </span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-500">
          <ShieldCheck size={12} className="text-green-500" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Encrypted</span>
        </div>
        <div className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-500">
          <Fingerprint size={12} className="text-accent-blue" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Verified Sequence</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">CodeShare v1.2.0</span>
      </div>
    </footer>
  );
};
