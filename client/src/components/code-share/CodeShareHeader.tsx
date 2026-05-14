import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Share2, Copy, Check, Maximize2, Minimize2, Edit3, Save, X, Lock } from 'lucide-react';

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
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md transition-all duration-300">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6 min-w-0">
          {/* macOS window controls */}
          <div className="hidden sm:flex gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700/50" />
            <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700/50" />
            <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700/50" />
          </div>
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
              <Code2 className="text-zinc-400" size={14} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-medium truncate text-zinc-100">{title || 'Untitled Snippet'}</h1>
                <Lock size={12} className="text-zinc-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 font-normal">
                  {createdAt ? new Date(createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Establishing Link...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="edit-actions"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2"
              >
                <button 
                  onClick={onToggleEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-50"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
                
                <button 
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </motion.div>
            ) : (
              <motion.button 
                key="read-actions"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={onToggleEdit}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 transition-all"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </motion.button>
            )}
          </AnimatePresence>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          <button 
            onClick={onCopy}
            disabled={isEditing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${copied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700'}`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button 
            onClick={onToggleFullscreen}
            className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition-all hover:border-zinc-700"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          <button className="hidden sm:flex p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition-all hover:border-zinc-700">
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
            className="absolute bottom-[-1px] left-0 w-full h-[1px] bg-white origin-left shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          />
        )}
      </AnimatePresence>
    </header>
  );
};
