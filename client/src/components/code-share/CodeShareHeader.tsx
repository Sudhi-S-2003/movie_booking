import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Share2, Copy, Check, Maximize2, Minimize2, Edit3, Save, X, Globe, Lock } from 'lucide-react';

interface CodeShareHeaderProps {
  title?: string;
  createdAt?: string;
  fullCode: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  isSaving: boolean;
  uploadProgress: number;
  copied: boolean;
  onCopy: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const CodeShareHeader: React.FC<CodeShareHeaderProps> = ({
  title,
  createdAt,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving,
  uploadProgress,
  copied,
  onCopy,
  isFullscreen,
  onToggleFullscreen
}) => {
  return (
    <header className="relative z-30 border-b border-white/[0.06] bg-[#0c0c0c]/40 backdrop-blur-3xl">
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-8 min-w-0">
          <div className="hidden sm:flex gap-2.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_10px_rgba(255,95,86,0.3)]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_10px_rgba(255,189,46,0.3)]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_10px_rgba(39,201,63,0.3)]" />
          </div>
          
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-2.5 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
              <Code2 className="text-accent-blue" size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[13px] font-black truncate tracking-wider text-white/90 uppercase">{title || 'Untitled Snippet'}</h1>
                <Lock size={10} className="text-white/20" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Globe size={10} className="text-accent-blue/40" />
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {createdAt ? new Date(createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Establishing Link...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="edit-actions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2"
              >
                <button 
                  onClick={onToggleEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/[0.03] text-white/40 hover:text-white border border-white/5 hover:border-white/20 transition-all duration-300 disabled:opacity-50"
                >
                  <X size={14} />
                  <span className="hidden md:inline">Discard</span>
                </button>
                
                <button 
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-accent-blue text-white shadow-[0_10px_20px_rgba(var(--accent-blue-rgb),0.2)] hover:shadow-accent-blue/40 transition-all duration-300 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{isSaving ? 'Syncing...' : 'Deploy'}</span>
                </button>
              </motion.div>
            ) : (
              <motion.button 
                key="read-actions"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={onToggleEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/[0.03] text-white/40 hover:text-white border border-white/5 hover:border-white/20 transition-all duration-300"
              >
                <Edit3 size={14} />
                <span className="hidden md:inline">Modify</span>
              </motion.button>
            )}
          </AnimatePresence>

          <div className="w-[1px] h-6 bg-white/5 mx-1" />

          <button 
            onClick={onCopy}
            disabled={isEditing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 disabled:opacity-20
              ${copied ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/[0.03] text-white/40 hover:text-white border border-white/5 hover:border-white/20'}`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Clone'}</span>
          </button>

          <button 
            onClick={onToggleFullscreen}
            className="p-2.5 bg-white/[0.03] border border-white/5 text-white/40 hover:text-white rounded-xl transition-all hover:border-white/20"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          <button className="hidden sm:flex p-2.5 bg-accent-blue/5 border border-accent-blue/10 text-accent-blue/60 hover:text-accent-blue rounded-xl hover:bg-accent-blue/10 transition-all">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <AnimatePresence>
        {isSaving && (
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: uploadProgress / 100 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 w-full h-[2px] bg-accent-blue origin-left shadow-[0_0_15px_rgba(var(--accent-blue-rgb),0.8)]"
          />
        )}
      </AnimatePresence>
    </header>
  );
};
