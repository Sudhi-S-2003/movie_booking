import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCommit, FilePlus, FileEdit, FileMinus, Folder, FolderPlus } from 'lucide-react';
import { generateDefaultCommitMessage } from '../../utils/commitMessage.js';

interface CommitModalProps {
  open: boolean;
  onClose: () => void;
  uncommittedChanges: Record<string, { type: 'add' | 'modify' | 'delete' | 'create-folder' | 'delete-folder'; content?: string }>;
  onConfirm: (message: string) => Promise<boolean>;
  isSaving: boolean;
}

export const CommitModal: React.FC<CommitModalProps> = ({
  open,
  onClose,
  uncommittedChanges,
  onConfirm,
  isSaving
}) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-fill default commit message when modal opens
  useEffect(() => {
    if (open) {
      setMessage(generateDefaultCommitMessage(uncommittedChanges));
      setError(null);
    }
  }, [open, uncommittedChanges]);

  const changesList = Object.keys(uncommittedChanges).map(path => ({
    path,
    type: uncommittedChanges[path]!.type
  })).sort((a, b) => a.path.localeCompare(b.path));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Commit message is required');
      return;
    }
    if (trimmed.length > 100) {
      setError('Commit message must be under 100 characters');
      return;
    }

    setError(null);
    const success = await onConfirm(trimmed);
    if (success) {
      setMessage('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0c0c0c] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/40">
              <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <GitCommit size={14} className="text-white" />
                Commit Staged Changes
              </h3>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
              {/* Message Input */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1">
                  Commit Message
                </label>
                <textarea
                  autoFocus
                  rows={2}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Fix syntax error in main router"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 focus:bg-black transition-all resize-none font-inter"
                />
                {error && (
                  <p className="text-[10px] font-bold text-rose-400 mt-1">{error}</p>
                )}
              </div>

              {/* Staged Changes List */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 block">
                  Staged Files ({changesList.length})
                </label>

                <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl max-h-[220px] overflow-y-auto custom-scrollbar p-2 divide-y divide-zinc-900/50">
                   {changesList.map(item => {
                    let Icon = FileEdit;
                    let iconColor = 'text-amber-400';
                    let pathStyle = 'text-zinc-300';
                    let statusLabel = 'modified';
                    let badgeBg = 'bg-amber-400/10 text-amber-400 border-amber-400/20';

                    if (item.type === 'add') {
                      Icon = FilePlus;
                      iconColor = 'text-emerald-400';
                      pathStyle = 'text-zinc-200';
                      statusLabel = 'added';
                      badgeBg = 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
                    } else if (item.type === 'delete') {
                      Icon = FileMinus;
                      iconColor = 'text-rose-400';
                      pathStyle = 'text-zinc-500 line-through';
                      statusLabel = 'deleted';
                      badgeBg = 'bg-rose-400/10 text-rose-400 border-rose-400/20';
                    } else if (item.type === 'create-folder') {
                      Icon = FolderPlus;
                      iconColor = 'text-emerald-400';
                      pathStyle = 'text-zinc-200';
                      statusLabel = 'new folder';
                      badgeBg = 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
                    } else if (item.type === 'delete-folder') {
                      Icon = Folder;
                      iconColor = 'text-rose-400';
                      pathStyle = 'text-zinc-500 line-through';
                      statusLabel = 'deleted folder';
                      badgeBg = 'bg-rose-400/10 text-rose-400 border-rose-400/20';
                    }

                    return (
                      <div key={item.path} className="flex items-center justify-between py-2 px-2 hover:bg-zinc-900/10">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Icon size={12} className={iconColor} />
                          <span className={`text-xs font-mono truncate ${pathStyle}`}>
                            {item.path}
                          </span>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border rounded-md ${badgeBg}`}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950/20 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-[1.5] py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 shadow-xl flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <GitCommit size={12} />
                    Commit changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
