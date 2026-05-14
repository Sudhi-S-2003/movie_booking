import React, { useRef, useEffect, useMemo } from 'react';
import CodeMirror, { EditorView, type Extension } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { tags as t } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';

interface CodeShareEditorProps {
  fullCode: string;
  isEditing: boolean;
  editedCode: string;
  onCodeChange: (code: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

// Custom Vercel-like Theme (Zinc/Slate)
const vercelTheme = createTheme({
  theme: 'dark',
  settings: {
    background: 'transparent',
    foreground: '#fafafa',
    caret: '#fafafa',
    selection: '#27272a',
    selectionMatch: '#27272a',
    lineHighlight: '#18181b',
    gutterBackground: 'transparent',
    gutterForeground: '#52525b',
  },
  styles: [
    { tag: t.comment, color: '#71717a' },
    { tag: t.variableName, color: '#fafafa' },
    { tag: [t.string, t.special(t.brace)], color: '#a1a1aa' },
    { tag: t.number, color: '#d4d4d8' },
    { tag: t.keyword, color: '#ffffff', fontWeight: 'bold' },
    { tag: t.operator, color: '#a1a1aa' },
    { tag: t.className, color: '#fafafa' },
    { tag: t.definition(t.typeName), color: '#fafafa' },
    { tag: t.typeName, color: '#fafafa' },
    { tag: t.angleBracket, color: '#71717a' },
    { tag: t.tagName, color: '#fafafa' },
    { tag: t.attributeName, color: '#a1a1aa' },
  ],
});

export const CodeShareEditor: React.FC<CodeShareEditorProps> = ({
  fullCode,
  isEditing,
  editedCode,
  onCodeChange,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onScroll
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const displayCode = isEditing ? editedCode : fullCode;

  // Infinite Scroll with Intersection Observer
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isEditing) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px', threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isEditing]);

  const extensions = useMemo(() => {
    const exts: Extension[] = [
      javascript({ jsx: true, typescript: true }),
      EditorView.lineWrapping,
      vercelTheme,
      EditorView.theme({
        '&': { fontSize: '13px', height: '100%' },
        '.cm-gutters': { border: 'none', backgroundColor: 'transparent', paddingRight: '1rem' },
        '.cm-gutterElement': { padding: '0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
        '.cm-content': { padding: '0 1.5rem', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
      }),
    ];
    return exts;
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
      <div 
        onScroll={onScroll}
        className="flex-1 overflow-auto custom-scrollbar relative scroll-smooth"
      >
        <CodeMirror
          value={displayCode}
          height="100%"
          theme={vercelTheme}
          extensions={extensions}
          editable={isEditing}
          readOnly={!isEditing}
          onChange={(value) => onCodeChange(value)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBrackets: true,
          }}
        />

        {/* Infinite Scroll Sentinel */}
        {!isEditing && (
          <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
            {isFetchingNextPage && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-6 bg-zinc-800 animate-pulse rounded-full" />
                  <div className="w-1.5 h-10 bg-zinc-700 animate-pulse rounded-full delay-75" />
                  <div className="w-1.5 h-4 bg-zinc-800 animate-pulse rounded-full delay-150" />
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Fetching Next Sequence</span>
              </div>
            )}
          </div>
        )}

        {/* Skeleton lines for initial load if needed (though usually fullCode is available) */}
        {!displayCode && !isFetchingNextPage && (
          <div className="p-8 space-y-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="h-4 bg-zinc-900 rounded-md animate-pulse" style={{ width: `${Math.random() * 40 + 40}%` }} />
            ))}
          </div>
        )}
      </div>

      {/* Decorative Gradients */}
      <div className="absolute inset-y-0 left-0 w-[1px] bg-zinc-800/50 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-[1px] bg-zinc-800/50 pointer-events-none" />
    </div>
  );
};
