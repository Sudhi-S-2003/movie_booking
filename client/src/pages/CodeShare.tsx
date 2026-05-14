import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Stores
import { useCodeShareStore } from '../store/codeShareStore.js';

// Components
import { CodeShareHeader } from '../components/code-share/CodeShareHeader.js';
import { CodeShareEditor } from '../components/code-share/CodeShareEditor.js';
import { CodeShareFooter } from '../components/code-share/CodeShareFooter.js';
import { CodeShareLoading } from '../components/code-share/CodeShareLoading.js';
import { CodeShareError } from '../components/code-share/CodeShareError.js';

export const CodeShare = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const fullCode = useCodeShareStore(state => state.fullCode);
  const meta = useCodeShareStore(state => state.meta);
  const isLoading = useCodeShareStore(state => state.isLoading);
  const isFetchingNext = useCodeShareStore(state => state.isFetchingNext);
  const isSaving = useCodeShareStore(state => state.isSaving);
  const isFetchingFull = useCodeShareStore(state => state.isFetchingFull);
  const uploadProgress = useCodeShareStore(state => state.uploadProgress);
  const hasNextPage = useCodeShareStore(state => state.hasNextPage);
  const init = useCodeShareStore(state => state.init);
  const loadMore = useCodeShareStore(state => state.loadMore);
  const ensureFull = useCodeShareStore(state => state.ensureFull);
  const save = useCodeShareStore(state => state.save);

  // URL State
  const signature = searchParams.get('signature');
  const expiresAt = searchParams.get('expiresAt');
  const category = searchParams.get('category');

  // Initial Fetch
  useEffect(() => {
    if (id && category && signature && expiresAt) {
      init({ id, category, signature, expiresAt });
    }
  }, [id, category, signature, expiresAt, init]);

  // UI State
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');

  // Sync editedCode when entering edit mode or when fullCode changes while NOT editing
  useEffect(() => {
    if (!isEditing) {
      setEditedCode(fullCode);
    }
  }, [fullCode, isEditing]);

  const handleCopy = useCallback(async () => {
    const full = await ensureFull();
    if (full) {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [ensureFull]);

  const handleToggleEdit = useCallback(async () => {
    if (!isEditing) {
      try {
      const full = await ensureFull();
      setEditedCode(full);
      setIsEditing(true);
      } catch (err) {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  }, [isEditing, ensureFull]);

  const handleSave = useCallback(async () => {
    try {
      await save(editedCode);
      setIsEditing(false);
    } catch (err) {
      // Error handled by store/toast
    }
  }, [editedCode, save]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing) handleSave();
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, handleSave, isFullscreen]);

  if (isLoading) return <CodeShareLoading />;
  if (!meta && !isLoading) return <CodeShareError message="Resource not found or access denied" />;

  return (
    <div className={`min-h-screen bg-[#050505] text-white flex flex-col font-inter overflow-hidden relative selection:bg-accent-blue/30 transition-all duration-700 ${isFullscreen ? 'p-0' : 'p-4 sm:p-10'}`}>
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-accent-blue/5 blur-[120px] rounded-full -z-0 pointer-events-none" />
      
      {/* Main Window */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex-1 w-full bg-[#0c0c0c] flex flex-col overflow-hidden relative z-10 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isFullscreen ? 'rounded-none border-none shadow-none' : 'max-w-7xl mx-auto rounded-[2.5rem] border border-white/[0.08] shadow-[0_0_100px_rgba(0,0,0,0.8)] h-[calc(100vh-5rem)]'}`}
      >
        <CodeShareHeader 
          title={meta?.title}
          createdAt={meta?.createdAt}
          fullCode={fullCode}
          isEditing={isEditing}
          onToggleEdit={handleToggleEdit}
          onSave={handleSave}
          isSaving={isSaving || isFetchingFull}
          uploadProgress={uploadProgress}
          copied={copied}
          onCopy={handleCopy}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <CodeShareEditor 
            fullCode={fullCode}
            isEditing={isEditing}
            editedCode={editedCode}
            onCodeChange={setEditedCode}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNext}
            fetchNextPage={loadMore}
          />
          
          <AnimatePresence>
            {(isSaving || isFetchingFull) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#050505]/40 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-blue animate-pulse">
                    Synchronizing... {uploadProgress}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Floating Action Toolbar (Edit Mode) */}
          <AnimatePresence>
            {isEditing && !isSaving && !isFetchingFull && (
              <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 50, x: '-50%' }}
                className="fixed bottom-24 left-1/2 z-50 flex items-center gap-2 p-2 bg-[#121212]/80 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                <button
                  onClick={handleToggleEdit}
                  className="px-6 py-2.5 text-[11px] font-black text-white/40 hover:text-white/80 uppercase tracking-[0.2em] transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-2.5 bg-accent-blue text-[11px] font-black text-[#050505] rounded-full uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(0,210,255,0.3)]"
                >
                  Deploy Changes
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <CodeShareFooter 
          isFetchingNextPage={isFetchingNext || isSaving || isFetchingFull}
          length={isEditing ? editedCode.length : fullCode.length}
          totalLength={meta?.totalLength}
        />
      </motion.div>
    </div>
  );
};

