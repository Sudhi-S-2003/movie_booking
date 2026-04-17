import React, { 
  useRef, 
  useEffect, 
  useImperativeHandle, 
  forwardRef, 
  useCallback 
} from 'react';

interface ThreadInputProps {
  value:       string;
  onChange:    (val: string) => void;
  onSend:      () => void;
  placeholder: string;
  disabled?:   boolean;
}

export interface ThreadInputHandle {
  focus:      () => void;
  insertText: (text: string) => void;
  clear:      () => void;
}

/**
 * A premium contenteditable-based input component.
 * Allows for better auto-expansion and more modern chat interaction.
 */
export const ThreadInput = forwardRef<ThreadInputHandle, ThreadInputProps>(({
  value,
  onChange,
  onSend,
  placeholder,
  disabled
}, ref) => {
  const innerRef = useRef<HTMLDivElement>(null);

  // Sync state to DOM if it's different (e.g. after a clear or external update)
  useEffect(() => {
    if (innerRef.current && innerRef.current.innerText !== value) {
      if (value === '') {
        innerRef.current.innerText = '';
      }
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      innerRef.current?.focus();
    },
    clear: () => {
      if (innerRef.current) innerRef.current.innerText = '';
      onChange('');
    },
    insertText: (text: string) => {
      const el = innerRef.current;
      if (!el) return;

      el.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);

      // Move cursor after the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      onChange(el.innerText);
    }
  }));

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerText);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return (
    <div className="relative flex-1 min-w-0">
      {/* Placeholder */}
      {!value && (
        <div className="absolute top-2.5 left-4 text-white/20 text-[12px] pointer-events-none select-none">
          {placeholder}
        </div>
      )}

      {/* Editable area */}
      <div
        ref={innerRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`
          w-full px-4 py-2.5 
          bg-white/[0.04] border border-white/[0.08] 
          rounded-2xl text-[12px] text-white 
          outline-none focus:border-white/[0.15] focus:bg-white/[0.08]
          transition-all leading-relaxed 
          min-h-[40px] max-h-[150px] overflow-y-auto custom-scrollbar
          whitespace-pre-wrap break-words
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
        `}
      />
    </div>
  );
});

ThreadInput.displayName = 'ThreadInput';
