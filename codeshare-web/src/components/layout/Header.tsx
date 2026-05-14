'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, Edit3, Save, Check, Shield } from 'lucide-react';
import { useCodeShareStore } from '@/store/useCodeShareStore';

interface HeaderProps {
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isEditing, onEditToggle, onSave }) => {
  const { isSaving, uploadProgress } = useCodeShareStore();

  return (
    <header className="h-14 border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
      {/* macOS Window Controls */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 px-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="h-4 w-[1px] bg-white/10 mx-2" />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white/90 tracking-tight">codeshare_v2.ts</span>
          <div className="flex items-center gap-1">
            <Shield size={10} className="text-green-500/80" />
            <span className="text-[9px] text-white/30 uppercase tracking-[0.1em] font-medium">Secured Sequence</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isSaving && (
          <div className="mr-4 flex items-center gap-2">
            <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500" 
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/30">{uploadProgress}%</span>
          </div>
        )}

        <button 
          onClick={isEditing ? onSave : onEditToggle}
          disabled={isSaving}
          className={`h-8 px-3 rounded-lg flex items-center gap-2 transition-all ${
            isEditing 
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
              : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-white/60 hover:text-white'
          }`}
        >
          {isSaving ? (
            <Loader size={14} className="animate-spin" />
          ) : isEditing ? (
            <>
              <Save size={14} />
              <span className="text-xs font-medium">Commit Changes</span>
            </>
          ) : (
            <>
              <Edit3 size={14} />
              <span className="text-xs font-medium">Edit Mode</span>
            </>
          )}
        </button>

        <div className="h-6 w-[1px] bg-white/10 mx-1" />

        <button className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-white transition-all">
          <Copy size={16} />
        </button>
        
        <button className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-white transition-all">
          <Share2 size={16} />
        </button>
      </div>
    </header>
  );
};

const Loader = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
