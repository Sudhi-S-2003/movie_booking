'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useCodeShareStore } from '@/store/useCodeShareStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import { createHighlighter, type Highlighter } from 'shiki';

interface CodeCanvasProps {
  isEditing: boolean;
  onCodeChange: (code: string) => void;
}

export const CodeCanvas: React.FC<CodeCanvasProps> = ({ isEditing, onCodeChange }) => {
  const { fullCode, hasNextPage, loadMore, isFetchingNext } = useCodeShareStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorView = useRef<EditorView | null>(null);
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);

  const lines = useMemo(() => fullCode.split('\n'), [fullCode]);

  // Initialize Shiki
  useEffect(() => {
    createHighlighter({
      themes: ['one-dark-pro'],
      langs: ['javascript', 'typescript', 'tsx', 'json', 'html', 'css', 'python', 'go', 'rust']
    }).then(setHighlighter);
  }, []);

  // Update highlighted lines when fullCode or highlighter changes
  useEffect(() => {
    if (!highlighter || isEditing) return;

    // Highlight the whole code and split into lines
    const html = highlighter.codeToHtml(fullCode, {
      lang: 'typescript', // Default to TS for now, can be dynamic later
      theme: 'one-dark-pro'
    });

    // Extract lines from the generated HTML
    // Shiki wraps the code in <pre><code>...</code></pre>
    const match = html.match(/<code[^>]*>([\s\S]*)<\/code>/);
    if (match) {
      const codeHtml = match[1];
      // Splitting by newline in HTML can be tricky, but Shiki 1.0 puts each line in a span or separates with \n
      setHighlightedLines(codeHtml.split('\n'));
    }
  }, [fullCode, highlighter, isEditing]);

  // Virtualization for Read Mode
  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  // URL Hash Line Linking
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#L') && lines.length > 0) {
      const lineNum = parseInt(hash.substring(2));
      if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
        // Wait for virtualization to be ready
        setTimeout(() => {
          rowVirtualizer.scrollToIndex(lineNum - 1, { align: 'center' });
        }, 100);
      }
    }
  }, [lines.length, rowVirtualizer]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNext || isEditing) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const trigger = document.getElementById('load-more-trigger');
    if (trigger) observer.observe(trigger);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNext, loadMore, isEditing]);

  // CodeMirror Initialization
  useEffect(() => {
    if (isEditing && editorRef.current && !editorView.current) {
      const state = EditorState.create({
        doc: fullCode,
        extensions: [
          basicSetup,
          javascript(),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onCodeChange(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-gutters': { backgroundColor: '#0f0f0f', border: 'none', color: '#444' },
            '.cm-content': { fontFamily: "'JetBrains Mono', monospace" }
          })
        ],
      });

      editorView.current = new EditorView({
        state,
        parent: editorRef.current,
      });
    }

    return () => {
      if (!isEditing && editorView.current) {
        editorView.current.destroy();
        editorView.current = null;
      }
    };
  }, [isEditing]);

  // Sync CodeMirror content if fullCode changes externally (e.g. initial load)
  useEffect(() => {
    if (editorView.current && isEditing) {
      const currentDoc = editorView.current.state.doc.toString();
      if (currentDoc !== fullCode) {
        const transaction = editorView.current.state.update({
          changes: { from: 0, to: currentDoc.length, insert: fullCode }
        });
        editorView.current.dispatch(transaction);
      }
    }
  }, [fullCode, isEditing]);

  const currentHash = typeof window !== 'undefined' ? window.location.hash : '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080808] relative">
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto custom-scrollbar relative ${isEditing ? 'hidden' : 'block'}`}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isHighlighted = currentHash === `#L${virtualRow.index + 1}`;
            return (
              <div
                key={virtualRow.index}
                id={`L${virtualRow.index + 1}`}
                className={`absolute top-0 left-0 w-full flex group/row hover:bg-white/[0.02] transition-colors ${isHighlighted ? 'bg-blue-500/10' : ''}`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="w-14 shrink-0 flex items-center justify-center border-r border-white/[0.03] bg-[#0c0c0c] sticky left-0 z-10 select-none">
                  <span className={`text-[10px] font-mono transition-colors ${isHighlighted ? 'text-blue-400' : 'text-white/10 group-hover/row:text-white/30'}`}>
                    {virtualRow.index + 1}
                  </span>
                </div>
                <div 
                  className="flex-1 px-8 font-mono text-sm leading-6 text-white/70 whitespace-pre"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightedLines[virtualRow.index] || lines[virtualRow.index] || ' ' 
                  }}
                />
              </div>
            );
          })}
          
          {/* Infinite Scroll Trigger */}
          {hasNextPage && (
            <div
              id="load-more-trigger"
              className="h-10 flex items-center justify-center py-20"
            >
              <AnimatePresence>
                {isFetchingNext && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-2 text-white/20 text-xs uppercase tracking-widest"
                  >
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    Fetching sequence...
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Editor Mode Layer */}
      <div 
        ref={editorRef} 
        className={`flex-1 overflow-hidden ${isEditing ? 'block' : 'hidden'}`}
      />

      {/* Decorative Overlays */}
      <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none" />
    </div>
  );
};
