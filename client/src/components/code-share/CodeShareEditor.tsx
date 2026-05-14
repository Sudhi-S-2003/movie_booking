import React, { useRef, useMemo } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';

interface CodeShareEditorProps {
  fullCode: string;
  isEditing: boolean;
  editedCode: string;
  onCodeChange: (code: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export const CodeShareEditor: React.FC<CodeShareEditorProps> = ({
  fullCode,
  isEditing,
  editedCode,
  onCodeChange,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const displayCode = isEditing ? editedCode : fullCode;

  const lines = useMemo(() => {
    const l = displayCode.split('\n');
    // Always show an extra line at the bottom in edit mode for better UX
    if (isEditing) l.push(''); 
    return l;
  }, [displayCode, isEditing]);

  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 15,
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080808] relative group/editor">
      <div
        ref={parentRef}
        className="flex-1 overflow-auto custom-scrollbar relative outline-none selection:bg-accent-blue/30"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            minHeight: '100%',
            paddingBottom: isEditing ? '100px' : '0px',
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Virtualized Rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full flex group/row transition-colors duration-150 hover:bg-white/[0.02]"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Gutter */}
              <div className={`w-14 shrink-0 flex items-center justify-center border-r border-white/[0.03] ${isEditing ? 'bg-[#0f0f0f]' : 'bg-[#0c0c0c]'} sticky left-0 z-10 select-none`}>
                <span className={`text-[10px] font-mono transition-colors duration-300 ${isEditing ? 'text-accent-blue/60' : 'text-white/10 group-hover/row:text-white/30'}`}>
                  {virtualRow.index + 1}
                </span>
              </div>

              {/* Code Content (Read Mode) */}
              {!isEditing && (
                <div
                  className="flex-1 px-8 font-mono text-[13px] md:text-sm leading-6 text-white/70 whitespace-pre"
                  style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Ubuntu Mono', 'Menlo', 'Monaco', 'Courier New', monospace"
                  }}
                >
                  {lines[virtualRow.index] || ' '}
                </div>
              )}
            </div>
          ))}

          {/* Edit Layer */}
          {isEditing && (
            <textarea
              autoFocus
              value={editedCode}
              onChange={(e) => onCodeChange(e.target.value)}
              className="absolute inset-0 w-full h-full bg-transparent pr-8 py-0 font-mono text-[13px] md:text-sm leading-6 text-white/90 outline-none resize-none caret-accent-blue z-20 overflow-auto block whitespace-pre"
              style={{
                minHeight: `${rowVirtualizer.getTotalSize()}px`,
                paddingLeft: '5.5rem',
                paddingTop: '0px',
                paddingBottom: '0px',
                lineHeight: '24px',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Ubuntu Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
              }}
              spellCheck={false}
            />
          )}
        </div>

        {/* Load More Trigger */}
        {!isEditing && hasNextPage && (
          <div
            className="flex justify-center py-24 relative z-10"
            style={{
              marginTop: `${Math.max(0, rowVirtualizer.getTotalSize() - (parentRef.current?.clientHeight || 0))}px`
            }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-8 py-4 bg-[#0c0c0c] border border-white/[0.08] rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] hover:border-white/[0.15] transition-all group/btn shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <Loader2 size={18} className="text-accent-blue animate-spin" />
              ) : (
                <ChevronDown size={18} className="text-white/40 group-hover/btn:text-accent-blue transition-colors" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover/btn:text-white transition-colors">
                  {isFetchingNextPage ? 'Retrieving Sequence...' : 'Retrieve Next Sequence'}
                </span>
                <span className="text-[9px] text-white/10 uppercase tracking-widest font-bold">Encrypted Chunk Transfer</span>
              </div>
            </motion.button>
          </div>
        )}
      </div>

      {/* Decorative Gradients */}
      <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none" />
    </div>
  );
};
