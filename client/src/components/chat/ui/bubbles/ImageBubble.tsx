import React, { memo, useState } from 'react';
import { ImageLightbox } from './ImageLightbox.js';
import type { ChatMessage } from '../../types.js';

interface ImageBubbleProps {
  msg:   ChatMessage;
  isOwn: boolean;
}

/**
 * Image message — renders attachments. When there's exactly one image we
 * show it full-width; 2-4 images fall back to a 2x2 grid (truncated if more).
 * Clicking any tile opens a fullscreen lightbox. If there are zero
 * attachments (upload still pending, or legacy row), we gracefully fall back
 * to a text bubble with the caption.
 */
export const ImageBubble = memo(({ msg, isOwn }: ImageBubbleProps) => {
  const urls = msg.attachments ?? [];
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (urls.length === 0) {
    return (
      <div className={`rounded-2xl px-3.5 py-2.5 text-[12px] break-words transition-transform duration-200 ${
        isOwn
          ? 'bg-gradient-to-br from-[#3730a3] via-[#4338ca] to-[#5b21b6] text-white rounded-br-md ring-1 ring-inset ring-white/[0.15] hover:-translate-y-0.5'
          : 'bg-white/[0.03] border border-white/[0.08] text-gray-200 rounded-bl-md'
      }`}>
        {msg.text || 'Photo'}
      </div>
    );
  }

  const shown = urls.slice(0, 4);
  const extra = urls.length - shown.length;
  const multiple = shown.length > 1;
  const tailRadius = isOwn ? 'rounded-br-md' : 'rounded-bl-md';

  return (
    <>
      <div
        className={`rounded-2xl overflow-hidden max-w-[320px] transition-transform duration-200 ${tailRadius} ${
          isOwn ? 'ring-1 ring-inset ring-white/[0.15] hover:-translate-y-0.5' : 'border border-white/[0.08]'
        }`}
      >
        <div
          className={`grid gap-1 bg-black/30 ${multiple ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {shown.map((url, i) => {
            const isLastWithOverflow = i === shown.length - 1 && extra > 0;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className="relative overflow-hidden group/img focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label={`Open image ${i + 1} of ${urls.length}`}
              >
                <img
                  src={url}
                  alt={`attachment ${i + 1}`}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.01] ${
                    multiple ? 'aspect-square' : 'max-h-80'
                  }`}
                />
                {isLastWithOverflow && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-black text-xl tabular-nums">
                    +{extra}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {msg.text && (
          <p className={`px-3 py-2 text-[12px] leading-snug break-words ${
            isOwn ? 'bg-[#4338ca] text-white' : 'bg-white/[0.03] text-gray-200'
          }`}>
            {msg.text}
          </p>
        )}
      </div>

      {lightboxIdx !== null && (
        <ImageLightbox
          urls={urls}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onIndex={(next) => setLightboxIdx(next)}
        />
      )}
    </>
  );
});

ImageBubble.displayName = 'ImageBubble';
