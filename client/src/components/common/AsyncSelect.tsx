import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface AsyncSelectOption {
  value: string;
  label: string;
}

interface AsyncSelectProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (query: string) => Promise<AsyncSelectOption[]>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  // If provided, this label is shown when value is set but options aren't loaded
  defaultLabel?: string;
}

export const AsyncSelect: React.FC<AsyncSelectProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Select...',
  disabled = false,
  className,
  defaultLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AsyncSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load options when opening or querying
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await onSearch(query);
        setOptions(results);
      } catch (err) {
        console.error('AsyncSelect search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, onSearch]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (defaultLabel || value || placeholder);

  return (
    <div className={clsx('relative w-full', className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 bg-slate-950 border rounded-lg text-sm transition-all',
          isOpen ? 'border-accent-purple shadow-[0_0_10px_rgba(109,40,217,0.2)]' : 'border-white/10 hover:border-white/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={clsx('truncate', !value && !selectedOption && 'text-gray-500')}>
          {value ? displayLabel : placeholder}
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-60">
          <div className="p-2 border-b border-white/5 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-sm text-white"
            />
            {loading && <Loader2 className="w-4 h-4 text-accent-purple animate-spin" />}
          </div>
          
          <div className="overflow-y-auto p-1">
            {!loading && options.length === 0 && (
              <div className="p-3 text-center text-xs text-gray-500">No results found.</div>
            )}
            
            {/* Show none option if value exists to allow clearing, or just a clear option */}
            <button
              type="button"
              className={clsx(
                'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                !value ? 'bg-accent-purple/20 text-accent-purple' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              None
            </button>

            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors mt-0.5',
                  value === opt.value
                    ? 'bg-accent-purple/20 text-accent-purple'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                )}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
