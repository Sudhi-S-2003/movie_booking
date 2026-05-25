import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code2,
  GitCommit,
  GitBranch,
  Columns,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  RotateCcw,
  Shield,
  Clock,
  GitPullRequest,
  Download,
  Loader2
} from 'lucide-react';
import CodeMirror, { EditorView, type Extension } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { tags as t } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';

import { useCodeShareStoreV2 } from '../store/codeShareStoreV2.js';
import { FileTree } from '../components/code-share-v2/FileTree.js';
import { CommitHistory } from '../components/code-share-v2/CommitHistory.js';
import { CommitModal } from '../components/code-share-v2/CommitModal.js';
import { DiffViewer } from '../components/code-share-v2/DiffViewer.js';
import { computeLineDiffClient } from '../utils/diffClient.js';
import { toast } from '../utils/toast.js';

// Custom editor theme (Zinc slate style)
const editorDarkTheme = createTheme({
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

export const CodeShareV2 = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const signature = searchParams.get('signature');
  const expiresAt = searchParams.get('expiresAt');
  const category = searchParams.get('category') || 'code-share-v2';

  const {
    project,
    files,
    folders,
    commits,
    selectedPath,
    activeCommitId,
    uncommittedChanges,
    viewedCommit,
    selectedDiffPath,
    isLoading,
    isSaving,
    init,
    selectFile,
    createFile,
    deleteFile,
    createFolder,
    deleteFolder,
    updateFileContent,
    discardChanges,
    commitChanges,
    checkoutCommit,
    loadCommitDetails,
    setSelectedDiffPath,
    fileContents,
    baseFileContents,
    fileLoadingProgress,
    isFileLoading,
    downloadWorkspace,
    isDownloading,
    downloadProgress,
    renameItem
  } = useCodeShareStoreV2();

  // Navigation Sidebar Tabs
  const [activeTab, setActiveTab] = useState<'files' | 'history'>('files');
  const isFullscreen = useMemo(() => searchParams.get('fullscreen') === 'true', [searchParams]);
  const setIsFullscreen = useCallback((val: boolean) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('fullscreen', 'true');
      } else {
        next.delete('fullscreen');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [copied, setCopied] = useState(false);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [previewLocalDiff, setPreviewLocalDiff] = useState(false);

  // Initial load
  useEffect(() => {
    if (id && signature && expiresAt) {
      init({ id, category, signature, expiresAt });
    }
  }, [id, category, signature, expiresAt, init]);

  // CodeMirror Extensions configuration
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      javascript({ jsx: true, typescript: true }),
      EditorView.lineWrapping,
      editorDarkTheme,
      EditorView.theme({
        '&': { fontSize: '13px', height: '100%' },
        '.cm-gutters': { border: 'none', backgroundColor: 'transparent', paddingRight: '1rem' },
        '.cm-gutterElement': { padding: '0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
        '.cm-content': { padding: '0 1.5rem', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
      }),
    ];
    return exts;
  }, []);

  // Compute current display code in editor (merge database file content with uncommitted edits)
  const displayCode = useMemo(() => {
    if (!selectedPath) return '';
    const change = uncommittedChanges[selectedPath];
    if (change) {
      return change.type === 'delete' ? '' : (change.content ?? '');
    }
    return fileContents[selectedPath] ?? '';
  }, [selectedPath, fileContents, uncommittedChanges]);

  // Compute client side diff for local changes preview
  const localDiffData = useMemo(() => {
    if (!selectedPath) return '[]';
    const oldContent = baseFileContents[selectedPath] ?? '';
    const newContent = displayCode;
    return JSON.stringify(computeLineDiffClient(oldContent, newContent));
  }, [selectedPath, baseFileContents, displayCode]);

  const handleCopy = async () => {
    if (displayCode) {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success('File content copied to clipboard');
    }
  };

  const activeChangesCount = Object.keys(uncommittedChanges).length;
  const isReadOnly = activeCommitId !== null;

  return (
    <div className={`h-screen bg-black text-white flex flex-col font-inter overflow-hidden relative selection:bg-zinc-800 transition-all duration-500 ${isFullscreen ? 'p-0' : 'p-4 sm:p-8'}`}>
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-zinc-900/10 blur-[130px] rounded-full -z-0 pointer-events-none" />

      {/* Main Container Window */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex-1 w-full bg-zinc-950 flex flex-col overflow-hidden relative z-10 border border-zinc-800/80 shadow-2xl transition-all duration-500
          ${isFullscreen ? 'rounded-none border-none h-screen' : 'max-w-6xl mx-auto rounded-2xl h-[calc(100vh-4rem)]'}`}
      >
        {/* Header Section */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            {/* Window Controls */}
            <div className="hidden sm:flex gap-1.5 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700/40" />
            </div>

            {/* Title / Version indicator */}
            <div className="flex items-center gap-2.5 min-w-0 pr-3 border-r border-zinc-800/80">
              <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                <Code2 className="text-zinc-300" size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-xs font-bold truncate text-zinc-100 uppercase tracking-wider">
                  {project?.title || 'Untitled Workspace'}
                </h1>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                  <GitBranch size={10} className="text-zinc-600" />
                  {isReadOnly ? `COMMIT: ${activeCommitId?.slice(-7)}` : 'HEAD / DRAFT'}
                </div>
              </div>
            </div>

            {/* Read-Only Banner / Warning */}
            {isReadOnly && (
              <span className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 border border-zinc-800/80 bg-zinc-900/60 rounded-md text-[9px] font-black uppercase tracking-wider text-zinc-400">
                <Clock size={10} />
                Historical view (Read Only)
              </span>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2">
            {!isReadOnly && activeChangesCount > 0 && (
              <>
                <button
                  onClick={discardChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all"
                  title="Discard changes"
                >
                  <RotateCcw size={12} />
                  Discard
                </button>
                <button
                  onClick={() => setIsCommitModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-all hover:scale-[1.02]"
                >
                  <GitCommit size={12} />
                  Commit ({activeChangesCount})
                </button>
              </>
            )}

            {/* Mode Preview Diffs */}
            {!isReadOnly && selectedPath && (
              <button
                onClick={() => setPreviewLocalDiff(!previewLocalDiff)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                  previewLocalDiff 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
                }`}
                title="Preview differences"
              >
                <Columns size={12} />
                {previewLocalDiff ? 'Editor' : 'Preview Diff'}
              </button>
            )}

            <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

            {/* Copy & Fullscreen */}
            <button
              onClick={handleCopy}
              disabled={!selectedPath}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all disabled:opacity-40 ${
                copied 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={downloadWorkspace}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download workspace ZIP"
            >
              {isDownloading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              <span>
                {isDownloading
                  ? downloadProgress !== null && downloadProgress >= 0
                    ? `Downloading (${downloadProgress}%)`
                    : 'Downloading...'
                  : 'Download ZIP'}
              </span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </header>

        {/* Content Section */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Sidebar Area */}
          <div className="w-64 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950/60 min-h-0">
            {/* Standard Explorer & Commits Navigation */}
            {viewedCommit === null ? (
              <>
                {/* Navigation Tabs */}
                <div className="flex border-b border-zinc-800 p-1.5 gap-1 bg-zinc-950">
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeTab === 'files' 
                        ? 'bg-zinc-900 text-white border border-zinc-800' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Explorer
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeTab === 'history' 
                        ? 'bg-zinc-900 text-white border border-zinc-800' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Commits
                  </button>
                </div>

                {/* Explorer list */}
                <div className="flex-grow overflow-hidden min-h-0">
                  {activeTab === 'files' ? (
                    <FileTree
                      files={files}
                      folders={folders}
                      selectedPath={selectedPath}
                      uncommittedChanges={uncommittedChanges}
                      onSelect={selectFile}
                      onCreateFile={createFile}
                      onDeleteFile={deleteFile}
                      onCreateFolder={createFolder}
                      onDeleteFolder={deleteFolder}
                      onRename={renameItem}
                      readOnly={isReadOnly}
                    />
                  ) : (
                    <CommitHistory
                      commits={commits}
                      activeCommitId={activeCommitId}
                      onCheckout={checkoutCommit}
                      onInspectCommit={loadCommitDetails}
                    />
                  )}
                </div>
              </>
            ) : (
              /* Commit Diffs Inspector Sidebar */
              <div className="flex-grow flex flex-col overflow-hidden min-h-0">
                <div className="flex items-center justify-between p-3.5 border-b border-zinc-800 bg-zinc-950">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                    <GitPullRequest size={12} className="text-zinc-500" />
                    Commit Changes
                  </span>
                  <button
                    onClick={() => useCodeShareStoreV2.setState({ viewedCommit: null, selectedDiffPath: null })}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[8px] uppercase tracking-wider font-black text-zinc-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2 space-y-0.5 custom-scrollbar">
                  {viewedCommit.changes.map((change: any) => {
                    const isSelected = selectedDiffPath === change.path;
                    const changeType = change.type;
                    let badgeColor = 'bg-amber-400/10 text-amber-400 border-amber-400/20';
                    let badgeLabel = 'M';

                    if (changeType === 'add') {
                      badgeColor = 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
                      badgeLabel = 'A';
                    } else if (changeType === 'delete') {
                      badgeColor = 'bg-rose-400/10 text-rose-400 border-rose-400/20';
                      badgeLabel = 'D';
                    }

                    return (
                      <div
                        key={change.path}
                        onClick={() => setSelectedDiffPath(change.path)}
                        className={`flex items-center justify-between px-3.5 py-2 mx-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-zinc-900 text-white font-medium' 
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                        }`}
                      >
                        <span className="text-xs font-mono truncate mr-2">{change.path}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Code ratio stats */}
                          <span className="font-mono text-[9px] font-bold">
                            {change.additions > 0 && <span className="text-emerald-500">+{change.additions}</span>}
                            {change.deletions > 0 && <span className="text-rose-500">-{change.deletions}</span>}
                          </span>
                          <span className={`w-4 h-4 flex items-center justify-center text-[9px] font-black border rounded ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Main Visual Panels */}
          <div className="flex-grow flex flex-col bg-black overflow-hidden relative min-h-0">
            {isLoading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Loading Workspace...</span>
              </div>
            )}

            {/* Standard Editor or Local Diff Mode */}
            {viewedCommit === null ? (
              selectedPath ? (
                isFileLoading && !fileContents[selectedPath] ? (
                  <div className="flex-grow flex flex-col items-center justify-center gap-3">
                    <div className="w-7 h-7 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Streaming Content... {fileLoadingProgress[selectedPath] || 0}%
                    </span>
                  </div>
                ) : previewLocalDiff ? (
                  <div className="flex-1 p-4 overflow-hidden min-h-0 h-full flex flex-col">
                    <DiffViewer diffData={localDiffData} filename={selectedPath} />
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden relative min-h-0 h-full">
                    {/* Background Progress Loading Bar */}
                    {isFileLoading && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-950 z-20 overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                          style={{ width: `${fileLoadingProgress[selectedPath] || 0}%` }}
                        />
                      </div>
                    )}
                    <CodeMirror
                      value={displayCode}
                      height="100%"
                      theme={editorDarkTheme}
                      extensions={extensions}
                      editable={!isReadOnly}
                      readOnly={isReadOnly}
                      onChange={(value) => updateFileContent(selectedPath, value)}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        allowMultipleSelections: true,
                        indentOnInput: true,
                        syntaxHighlighting: true,
                        bracketMatching: true,
                        autocompletion: true,
                        highlightActiveLine: true,
                        closeBrackets: true,
                      }}
                    />
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <GitBranch size={28} className="text-zinc-800 mb-3 animate-pulse" />
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Empty Workspace</p>
                  <p className="text-zinc-600 text-[10px] mt-1 max-w-[200px] leading-relaxed">
                    Create a file in the sidebar explorer to begin coding.
                  </p>
                </div>
              )
            ) : (
              /* Commit Inspector Panel (Diff Mode) */
              <div className="flex-grow flex flex-col overflow-hidden min-h-0">
                {/* Commit Header Details */}
                <div className="p-4 bg-zinc-950/80 border-b border-zinc-900">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white pr-2 truncate leading-tight select-none">
                      {viewedCommit.message}
                    </h3>
                    <span className="font-mono text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded font-semibold select-all">
                      COMMIT {viewedCommit._id}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Committed by <span className="font-bold text-zinc-400">{viewedCommit.createdBy}</span> on{' '}
                    {new Date(viewedCommit.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Diff Viewer panel */}
                <div className="flex-1 p-4 overflow-hidden bg-black min-h-0 h-full flex flex-col">
                  {selectedDiffPath ? (
                    (() => {
                      const change = viewedCommit.changes.find((ch: any) => ch.path === selectedDiffPath);
                      return change ? (
                        <DiffViewer diffData={change.diff || '[]'} filename={selectedDiffPath} />
                      ) : (
                        <div className="text-zinc-600 text-xs text-center py-10 uppercase tracking-widest font-bold">
                          Error loading diff
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-zinc-600 text-xs text-center py-10 uppercase tracking-widest font-bold">
                      Select a file to inspect diff
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Area */}
        <footer className="px-5 py-3.5 border-t border-zinc-850 bg-zinc-950 flex items-center justify-between text-[10px] tracking-wider text-zinc-500 font-bold uppercase select-none">
          <div className="flex items-center gap-4">
            <span>FILES: {files.length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
            <span>COMMITS: {commits.length}</span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-600">
            <Shield size={11} className="text-zinc-700" />
            Time Limited API Session V2
          </div>
        </footer>
      </motion.div>

      {/* Commit Trigger Modal */}
      <CommitModal
        open={isCommitModalOpen}
        onClose={() => setIsCommitModalOpen(false)}
        uncommittedChanges={uncommittedChanges}
        onConfirm={commitChanges}
        isSaving={isSaving}
      />
    </div>
  );
};
