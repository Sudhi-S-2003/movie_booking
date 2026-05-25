import React from 'react';
import { GitCommit, GitBranch, ArrowLeft, Eye } from 'lucide-react';

interface CommitV2 {
  _id: string;
  message: string;
  createdBy: string;
  createdAt: string;
  totalChanges: number;
  totalAdditions: number;
  totalDeletions: number;
}

interface CommitHistoryProps {
  commits: CommitV2[];
  activeCommitId: string | null;
  onCheckout: (commitId: string | null) => void;
  onInspectCommit: (commitId: string) => void;
}

export const CommitHistory: React.FC<CommitHistoryProps> = ({
  commits,
  activeCommitId,
  onCheckout,
  onInspectCommit
}) => {
  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Commits Explorer Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <GitBranch size={12} className="text-zinc-500" />
          Commits Log ({commits.length})
        </span>

        {activeCommitId && (
          <button
            onClick={() => onCheckout(null)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[9px] uppercase tracking-wider font-black text-white transition-all hover:scale-[1.02]"
            title="Return to HEAD"
          >
            <ArrowLeft size={10} />
            HEAD
          </button>
        )}
      </div>

      {/* Commits Timeline List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3.5 custom-scrollbar relative">
        {/* Continuous vertical timeline connector line */}
        <div className="absolute left-6.5 top-5 bottom-5 w-[1px] bg-zinc-800/60 pointer-events-none" />

        {commits.map((c, idx) => {
          const isSelected = activeCommitId === c._id || (activeCommitId === null && idx === 0);
          const shortHash = c._id.slice(-7);
          const formattedDate = new Date(c.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={c._id}
              onClick={() => onCheckout(c._id)}
              className={`relative flex gap-3.5 p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-zinc-900/60 border-zinc-700/60 shadow-lg text-white'
                  : 'bg-transparent border-transparent hover:border-zinc-800 hover:bg-zinc-900/20 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {/* Timeline Node */}
              <div className="relative z-10 flex-shrink-0 flex items-start pt-0.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-white border-white text-black shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}>
                  <GitCommit size={12} />
                </div>
              </div>

              {/* Commit Content */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold truncate leading-tight select-none pr-1">
                    {c.message}
                  </h4>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 font-bold select-all flex-shrink-0 shadow-inner">
                    {shortHash}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-normal mt-0.5">
                  <div className="truncate pr-2">
                    {c.createdBy} • {formattedDate}
                  </div>
                  
                  {/* File stats additions/deletions indicator */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[9px] font-bold">
                    {c.totalAdditions > 0 && (
                      <span className="text-emerald-500">+{c.totalAdditions}</span>
                    )}
                    {c.totalDeletions > 0 && (
                      <span className="text-rose-500">-{c.totalDeletions}</span>
                    )}
                  </div>
                </div>

                {/* Inspect/Diff button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectCommit(c._id);
                  }}
                  className="mt-2 flex items-center gap-1 self-start px-2 py-1 rounded bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[9px] uppercase tracking-wider font-bold text-zinc-400 hover:text-white transition-all shadow-inner"
                  title="Inspect Commit Changes"
                >
                  <Eye size={10} />
                  Inspect Changes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
