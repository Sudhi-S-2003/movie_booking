import React, { memo, useRef, useEffect, useCallback } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose:  () => void;
}

/**
 * Emoji picker drawer — wraps @emoji-mart/react with dark theme
 * and click-outside / Escape-to-close behaviour.
 */
export const EmojiPicker = memo(({ onSelect, onClose }: EmojiPickerProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use setTimeout so the button click that opened the picker doesn't
    // immediately trigger the outside-click handler.
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSelect = useCallback(
    (emoji: { native: string }) => {
      onSelect(emoji.native);
    },
    [onSelect],
  );

  return (
    <div
      ref={wrapperRef}
      className="absolute bottom-full left-0 mb-2 z-50"
    >
      <Picker
        data={data}
        onEmojiSelect={handleSelect}
        theme="dark"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
        perLine={8}
        emojiSize={22}
        emojiButtonSize={32}
        set="native"
      />
    </div>
  );
});

EmojiPicker.displayName = 'EmojiPicker';
