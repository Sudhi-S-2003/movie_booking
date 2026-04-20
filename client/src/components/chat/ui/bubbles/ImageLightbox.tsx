import React, { memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  urls:      string[];
  index:     number;
  onClose:   () => void;
  onIndex?:  (next: number) => void;
}

/**
 * Fullscreen image viewer portalled onto `document.body`. Closes on Escape,
 * backdrop click, or the X button. When more than one URL is provided, it
 * exposes prev/next chevrons and arrow-key navigation. Pointer-events are
 * isolated per-slot so clicking the image itself doesn't dismiss.
 */
export const ImageLightbox = memo(({ urls, index, onClose, onIndex }: ImageLightboxProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (onIndex && urls.length > 1) {
        if (e.key === 'ArrowLeft')  onIndex((index - 1 + urls.length) % urls.length);
        if (e.key === 'ArrowRight') onIndex((index + 1) % urls.length);
      }
    };
    document.addEventListener('keydown', onKey);
    // Lock background scroll while the lightbox is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, urls.length, onClose, onIndex]);

  const url = urls[index];
  if (!url) return null;

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndex?.((index - 1 + urls.length) % urls.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndex?.((index + 1) % urls.length);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="lb"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close image viewer"
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X size={20} />
        </button>

        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight size={22} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white/70 tabular-nums bg-white/10 border border-white/20 rounded-full px-3 py-1">
              {index + 1} / {urls.length}
            </div>
          </>
        )}

        <motion.img
          key={url}
          src={url}
          alt="attachment"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
});

ImageLightbox.displayName = 'ImageLightbox';
