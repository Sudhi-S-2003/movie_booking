import React, { useRef, useState, useEffect } from 'react';

interface TwoFactorInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  isBackupMode?: boolean;
}

export const TwoFactorInput: React.FC<TwoFactorInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  isBackupMode = false,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    // Keep internal array synced with external value
    const cleanVal = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
    const newDigits = Array(length).fill('');
    for (let i = 0; i < cleanVal.length; i++) {
      newDigits[i] = cleanVal[i] || '';
    }
    setDigits(newDigits);
  }, [value, length]);

  const focusInput = (index: number) => {
    if (inputsRef.current[index]) {
      inputsRef.current[index]?.focus();
    }
  };

  const handleTextChange = (text: string, index: number) => {
    // Only allow digits/letters based on backup mode
    const cleanChar = isBackupMode
      ? text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : text.replace(/[^0-9]/g, '');

    if (!cleanChar) return;

    const newDigits = [...digits];
    // Take the last entered character if multiple (e.g. keypress autocomplete)
    const char = cleanChar.slice(-1);
    newDigits[index] = char;

    setDigits(newDigits);
    const newVal = newDigits.join('');
    onChange(newVal);

    // Auto focus next input
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Empty slot, go back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
        focusInput(index - 1);
      } else {
        // Just clear current
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    // Remove dashes/whitespace
    const cleanData = isBackupMode
      ? pastedData.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : pastedData.replace(/[^0-9]/g, '');

    const truncated = cleanData.slice(0, length);
    if (!truncated) return;

    const newDigits = Array(length).fill('');
    for (let i = 0; i < length; i++) {
      newDigits[i] = truncated[i] || '';
    }
    
    setDigits(newDigits);
    onChange(newDigits.join(''));

    // Focus last filled index or keep focus on last one
    const focusIdx = Math.min(truncated.length, length - 1);
    focusInput(focusIdx);
  };

  return (
    <div className="flex justify-center items-center gap-3">
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <div key={index} className="relative">
            <input
              type={isBackupMode ? 'text' : 'text'}
              inputMode={isBackupMode ? 'text' : 'numeric'}
              pattern={isBackupMode ? '[a-zA-Z0-9]*' : '[0-9]*'}
              maxLength={1}
              value={digits[index] || ''}
              disabled={disabled}
              ref={(el) => {
                if (el) inputsRef.current[index] = el;
              }}
              onChange={(e) => handleTextChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              className="w-12 h-14 bg-[#141416] border border-white/5 focus:border-accent-purple/35 focus:ring-1 focus:ring-accent-purple/35 rounded-2xl text-center text-xl font-black text-white focus:outline-none transition-all shadow-inner tracking-widest"
            />
            {/* Display a hyphen in the middle for backup code layout (e.g. XXXX-XXXX) */}
            {isBackupMode && length === 8 && index === 3 && (
              <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-gray-700 font-bold">-</span>
            )}
          </div>
        ))}
    </div>
  );
};
