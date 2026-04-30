import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

interface SelectOption { value: string; label: string }

interface FilterSelect {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  accentClass?: string; // e.g. 'focus:border-accent-pink'
}

interface FilterBarProps {
  /** Search */
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  /** Optional dropdown filters */
  selects?: FilterSelect[];
  /** Right-side slot: count badge, city badge, etc. */
  right?: ReactNode;
}

export const FilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  selects = [],
  right,
}: FilterBarProps) => (
  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-surface/30 backdrop-blur-3xl border border-white/5 p-5 rounded-[36px]">
    {/* Left: search + selects */}
    <div className="flex flex-wrap gap-3 items-center flex-1">
      {/* Search */}
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-blue transition-colors"
          size={17}
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-52 transition-all placeholder:text-gray-600"
        />
      </div>

      {/* Dynamic dropdowns */}
      {selects.map((s, i) => (
        <select
          key={i}
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white outline-none transition-all ${s.accentClass ?? 'focus:border-accent-blue'}`}
        >
          {s.options.map((o) => (
            <option key={o.value} value={o.value} className="bg-background normal-case tracking-normal font-normal">
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>

    {/* Right slot */}
    {right && <div className="flex items-center gap-3 flex-shrink-0">{right}</div>}
  </div>
);
