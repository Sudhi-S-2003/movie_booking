'use client';

import React from 'react';
import { useCodeShareStore } from '@/store/useCodeShareStore';
import { Lock, Cpu, Globe, Database } from 'lucide-react';

export const Footer: React.FC = () => {
  const { fullCode, isLoading, isFetchingNext } = useCodeShareStore();
  
  const byteCount = new Blob([fullCode]).size;
  const kb = (byteCount / 1024).toFixed(2);
  const lines = fullCode.split('\n').length;

  return (
    <footer className="h-8 border-t border-white/[0.05] bg-[#0c0c0c] flex items-center justify-between px-4 text-[10px] font-mono text-white/30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-green-500/60">
          <Lock size={12} />
          <span className="uppercase tracking-widest font-bold">Secure</span>
        </div>
        <div className="h-3 w-[1px] bg-white/10" />
        <div className="flex items-center gap-1.5">
          <Database size={12} />
          <span>{kb} KB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="opacity-50">LINES:</span>
          <span className="text-white/60">{lines}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isFetchingNext && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-blue-500 animate-pulse rounded-full" />
              <span className="w-1 h-1 bg-blue-500 animate-pulse delay-75 rounded-full" />
              <span className="w-1 h-1 bg-blue-500 animate-pulse delay-150 rounded-full" />
            </div>
            <span className="text-blue-500/80">CHUNK_PULL</span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5">
          <Globe size={12} />
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu size={12} />
          <span>JS/TS</span>
        </div>
      </div>
    </footer>
  );
};
