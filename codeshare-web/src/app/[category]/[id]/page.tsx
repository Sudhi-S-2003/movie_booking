'use client';

import React, { useEffect, useState, use, useRef, useCallback } from 'react';
import { useCodeShareStore } from '@/store/useCodeShareStore';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CodeCanvas } from '@/components/code-share/CodeCanvas';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, ChevronUp } from 'lucide-react';
import { draftManager } from '@/utils/draftManager';

export default function CodeSharePage({ params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = use(params);
  const searchParams = useSearchParams();
  const signature = searchParams.get('signature');
  const expiresAt = searchParams.get('expiresAt');
  
  const { init, save, fullCode, ensureFull } = useCodeShareStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    if (category && id && signature && expiresAt) {
      init({ category, id, signature, expiresAt });
    }
  }, [category, id, signature, expiresAt, init]);

  // Sync editedCode when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedCode(fullCode);
    }
  }, [fullCode, isEditing]);

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

  const handleSave = async () => {
    await save(editedCode);
    if (id) await draftManager.deleteDraft(id);
    setIsEditing(false);
  };

  // Debounced Auto-save Draft
  useEffect(() => {
    if (!isEditing || !id || !editedCode) return;

    const timeout = setTimeout(async () => {
      try {
        await draftManager.saveDraft(id, editedCode);
      } catch (err) {
        console.warn('Failed to save draft', err);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [editedCode, isEditing, id]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    // Show floating actions when near bottom OR when header is hidden
    const isNearBottom = scrollTop + clientHeight > scrollHeight - 100;
    const hasScrolledDown = scrollTop > 400;
    setShowFloatingActions(isNearBottom || (hasScrolledDown && !isHeaderVisible));

    if (scrollTop > 150) {
      if (scrollTop > lastScrollTop.current + 10) {
        setIsHeaderVisible(false);
      } else if (scrollTop < lastScrollTop.current - 20) {
        setIsHeaderVisible(true);
      }
    } else {
      setIsHeaderVisible(true);
    }
    lastScrollTop.current = scrollTop;
  }, [isHeaderVisible]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-white selection:bg-blue-500/30">
      <Header 
        isEditing={isEditing} 
        onEditToggle={handleToggleEdit} 
        onSave={handleSave} 
        isVisible={isHeaderVisible}
      />
      
      <main className="flex-1 flex flex-col min-h-0 relative">
        <CodeCanvas 
          isEditing={isEditing} 
          editedCode={editedCode}
          onCodeChange={setEditedCode} 
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
              onClick={() => setIsHeaderVisible(true)}
              className="absolute bottom-6 right-6 z-40 p-3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl text-white/40 hover:text-white hover:border-white/20 transition-all"
            >
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
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
