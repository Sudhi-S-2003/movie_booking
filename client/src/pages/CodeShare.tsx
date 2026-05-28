import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, ChevronUp } from 'lucide-react';
import "../css/codeshare.css"

// Stores
import { useCodeShareStore } from '../store/codeShareStore.js';

// Components
import { CodeShareHeader } from '../components/code-share/CodeShareHeader.js';
import { CodeShareEditor } from '../components/code-share/CodeShareEditor.js';
import { CodeShareFooter } from '../components/code-share/CodeShareFooter.js';
import { CodeShareLoading } from '../components/code-share/CodeShareLoading.js';
import { CodeShareError } from '../components/code-share/CodeShareError.js';
import { draftManager } from '../utils/draftManager.js';
import { toast } from '../utils/toast.js';

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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const lastScrollTop = useRef(0);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    editorScrollRef.current = target;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    // Show floating actions when near bottom (within 200px) OR when header is hidden and we've scrolled a bit
    const isNearBottom = scrollTop + clientHeight > scrollHeight - 100;
    const hasScrolledDown = scrollTop > 400;
    setShowFloatingActions(isNearBottom || (hasScrolledDown && !isHeaderVisible));

    // Header hide/show logic - stay visible if editing
    if (isEditing) {
      setIsHeaderVisible(true);
    } else if (scrollTop > 150) {
      if (scrollTop > lastScrollTop.current + 10) {
        // Scrolling down - hide header
        setIsHeaderVisible(false);
      } else if (scrollTop < lastScrollTop.current - 20) {
        // Scrolling up - show header
        setIsHeaderVisible(true);
      }
    } else {
      setIsHeaderVisible(true);
    }

    lastScrollTop.current = scrollTop;
  }, [isHeaderVisible, isEditing]);

  const scrollToTop = useCallback(() => {
    if (editorScrollRef.current) {
      editorScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      setIsHeaderVisible(true);
    }
  }, []);

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
        
        // Check for local draft
        if (id) {
          const draft = await draftManager.getDraft(id);
          if (draft && draft.code !== full) {
            setEditedCode(draft.code);
            setIsEditing(true);
            toast.success('Restored unsaved changes from draft');
            return;
          }
        }

        setEditedCode(full);
        setIsEditing(true);
      } catch (err) {
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  }, [isEditing, ensureFull, id]);

  const handleSave = useCallback(async () => {
    try {
      await save(editedCode);
      if (id) await draftManager.deleteDraft(id);
      setIsEditing(false);
    } catch (err) {
      // Error handled by store/toast
    }
  }, [editedCode, save, id]);

  // Debounced Auto-save Draft
  useEffect(() => {
    if (!isEditing || !id || !editedCode) return;

    const timeout = setTimeout(async () => {
      try {
        await draftManager.saveDraft(id, editedCode);
      } catch (err) {
        console.warn('Failed to save draft', err);
      }
    }, 1000); // Save after 1s of inactivity

    return () => clearTimeout(timeout);
  }, [editedCode, isEditing, id]);

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
    <div className={`min-h-screen bg-black text-white flex flex-col font-inter overflow-hidden relative selection:bg-zinc-800 transition-all duration-500 ${isFullscreen ? 'p-0' : 'p-4 sm:p-8'}`}>
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-zinc-900/20 blur-[120px] rounded-full -z-0 pointer-events-none" />
      
      {/* Main Window */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex-1 w-full bg-zinc-950 flex flex-col overflow-hidden relative z-10 transition-all duration-500
          ${isFullscreen ? 'rounded-none border-none' : 'max-w-6xl mx-auto rounded-xl border border-zinc-800 shadow-2xl h-[calc(100vh-4rem)]'}`}
      >
        <motion.div
          animate={{ 
            height: isHeaderVisible ? 'auto' : 0,
            opacity: isHeaderVisible ? 1 : 0,
            y: isHeaderVisible ? 0 : -20
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden z-30 sticky top-0"
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
        </motion.div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <CodeShareEditor 
            fullCode={fullCode}
            isEditing={isEditing}
            editedCode={editedCode}
            onCodeChange={setEditedCode}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNext}
            fetchNextPage={loadMore}
            onScroll={handleScroll}
          />

          <AnimatePresence>
            {showFloatingActions && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!isHeaderVisible) {
                    setIsHeaderVisible(true);
                  } else {
                    scrollToTop();
                  }
                }}
                className="absolute bottom-6 right-6 z-40 p-3 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-full shadow-2xl text-zinc-400 hover:text-white hover:border-zinc-700 transition-all group"
                title={isHeaderVisible ? "Scroll to Top" : "Expand Header"}
              >
                <div className="relative">
                  <AnimatePresence mode="wait">
                    {!isHeaderVisible ? (
                      <motion.div
                        key="more"
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 90 }}
                      >
                        <MoreHorizontal size={20} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="up"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        <ChevronUp size={20} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {(isSaving || isFetchingFull) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
                    {isSaving ? `Uploading... ${uploadProgress}%` : 'Retrieving Full Content...'}
                  </span>
                </div>
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

