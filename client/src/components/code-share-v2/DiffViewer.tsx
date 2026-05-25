import React, { useState, useMemo } from 'react';
import { Columns, Eye } from 'lucide-react';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

interface DiffViewerProps {
  diffData: string; // JSON string of DiffLine[]
  filename: string;
}

interface SplitDiffRow {
  left?: { lineNumber?: number; content: string; type: 'removed' | 'unchanged' };
  right?: { lineNumber?: number; content: string; type: 'added' | 'unchanged' };
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffData, filename }) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const diffLines = useMemo((): DiffLine[] => {
    try {
      return JSON.parse(diffData);
    } catch {
      return [];
    }
  }, [diffData]);

  const splitRows = useMemo((): SplitDiffRow[] => {
    const rows: SplitDiffRow[] = [];
    let i = 0;
    while (i < diffLines.length) {
      const line = diffLines[i]!;
      if (line.type === 'unchanged') {
        rows.push({
          left: { lineNumber: line.leftLineNumber, content: line.content, type: 'unchanged' },
          right: { lineNumber: line.rightLineNumber, content: line.content, type: 'unchanged' }
        });
        i++;
      } else {
        // Group consecutive removed and added sequences
        const removed: DiffLine[] = [];
        const added: DiffLine[] = [];
        
        while (i < diffLines.length && diffLines[i]!.type === 'removed') {
          removed.push(diffLines[i]!);
          i++;
        }
        while (i < diffLines.length && diffLines[i]!.type === 'added') {
          added.push(diffLines[i]!);
          i++;
        }

        const maxLen = Math.max(removed.length, added.length);
        for (let k = 0; k < maxLen; k++) {
          const rem = removed[k];
          const add = added[k];
          rows.push({
            left: rem ? { lineNumber: rem.leftLineNumber, content: rem.content, type: 'removed' } : undefined,
            right: add ? { lineNumber: add.rightLineNumber, content: add.content, type: 'added' } : undefined
          });
        }
      }
    }
    return rows;
  }, [diffLines]);

  return (
    <div className="flex flex-col h-full bg-black text-zinc-100 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <span className="font-mono text-xs text-zinc-400 truncate font-semibold">{filename}</span>
        
        <div className="flex items-center gap-1.5 p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">
          <button
            onClick={() => setViewMode('unified')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${
              viewMode === 'unified' 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Eye size={12} />
            Unified
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-black transition-all ${
              viewMode === 'split' 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Columns size={12} />
            Split
          </button>
        </div>
      </div>

      {/* Diff Table Container */}
      <div className="flex-1 overflow-auto custom-scrollbar font-mono text-[12px] leading-5">
        {viewMode === 'unified' ? (
          <div className="w-full min-w-max">
            {diffLines.map((line, idx) => {
              const isAdded = line.type === 'added';
              const isRemoved = line.type === 'removed';
              
              let rowBg = 'hover:bg-zinc-900/40';
              let sign = ' ';
              let codeColor = 'text-zinc-300';
              let lineNumBg = 'text-zinc-600';

              if (isAdded) {
                rowBg = 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500';
                sign = '+';
                codeColor = 'text-emerald-300';
                lineNumBg = 'bg-emerald-950/10 text-emerald-500/80';
              } else if (isRemoved) {
                rowBg = 'bg-rose-950/20 hover:bg-rose-950/30 text-rose-300 border-l-2 border-rose-500';
                sign = '-';
                codeColor = 'text-rose-300';
                lineNumBg = 'bg-rose-950/10 text-rose-500/80';
              }

              return (
                <div key={idx} className={`flex items-stretch border-b border-zinc-900/20 ${rowBg}`}>
                  {/* Left Line Number */}
                  <div className={`w-12 select-none text-right pr-3 border-r border-zinc-900/45 ${lineNumBg}`}>
                    {line.leftLineNumber || ''}
                  </div>
                  {/* Right Line Number */}
                  <div className={`w-12 select-none text-right pr-3 border-r border-zinc-900/45 ${lineNumBg}`}>
                    {line.rightLineNumber || ''}
                  </div>
                  {/* Sign */}
                  <div className="w-6 select-none flex items-center justify-center font-bold text-zinc-500">
                    {sign}
                  </div>
                  {/* Code Line */}
                  <pre className={`pl-2 pr-4 py-0.5 whitespace-pre ${codeColor}`}>
                    {line.content}
                  </pre>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full min-w-max divide-y divide-zinc-900/30">
            {splitRows.map((row, idx) => {
              const left = row.left;
              const right = row.right;

              const leftBg = left?.type === 'removed' 
                ? 'bg-rose-950/20 hover:bg-rose-950/30 text-rose-300 border-l-2 border-rose-500' 
                : 'bg-transparent text-zinc-400 hover:bg-zinc-900/10';
              const rightBg = right?.type === 'added' 
                ? 'bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500' 
                : 'bg-transparent text-zinc-400 hover:bg-zinc-900/10';

              return (
                <div key={idx} className="flex items-stretch divide-x divide-zinc-900/50">
                  {/* Left Column (Old) */}
                  <div className={`flex-1 flex items-stretch min-w-0 ${leftBg}`}>
                    <div className="w-12 select-none text-right pr-3 border-r border-zinc-900/30 text-zinc-600">
                      {left?.lineNumber || ''}
                    </div>
                    <div className="w-6 select-none flex items-center justify-center text-zinc-600 font-bold">
                      {left?.type === 'removed' ? '-' : ' '}
                    </div>
                    <pre className="flex-1 pl-2 pr-4 py-0.5 whitespace-pre truncate text-zinc-300">
                      {left ? left.content : ''}
                    </pre>
                  </div>

                  {/* Right Column (New) */}
                  <div className={`flex-1 flex items-stretch min-w-0 ${rightBg}`}>
                    <div className="w-12 select-none text-right pr-3 border-r border-zinc-900/30 text-zinc-600">
                      {right?.lineNumber || ''}
                    </div>
                    <div className="w-6 select-none flex items-center justify-center text-zinc-600 font-bold">
                      {right?.type === 'added' ? '+' : ' '}
                    </div>
                    <pre className="flex-1 pl-2 pr-4 py-0.5 whitespace-pre truncate text-zinc-300">
                      {right ? right.content : ''}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
