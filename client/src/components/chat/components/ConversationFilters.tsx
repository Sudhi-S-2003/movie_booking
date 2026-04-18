import React, { memo } from 'react';
import { Search, X, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import {
  TYPE_LABELS,
  SORT_BY_LABELS,
  getSortOrderLabel,
  type ConversationFiltersState,
  type ConversationTypeFilter,
  type ConversationSortBy,
  type ConversationSortOrder,
} from '../hooks/useConversationFilters.js';

interface ConversationFiltersProps {
  value:          ConversationFiltersState;
  onChangeQ:      (q: string) => void;
  onChangeType:   (t: ConversationTypeFilter | null) => void;
  onToggleUnread: (unread: boolean) => void;
  onChangeSortBy:    (s: ConversationSortBy) => void;
  onChangeSortOrder: (o: ConversationSortOrder) => void;
  onReset:        () => void;
  isDirty:        boolean;
}

const TYPE_OPTIONS: ReadonlyArray<ConversationTypeFilter> = ['direct', 'group', 'system', 'api'];
const SORT_BY_OPTIONS: ReadonlyArray<ConversationSortBy> = ['activity', 'created', 'name'];

/**
 * Filter bar for the conversation list.
 *
 * Layout:
 *   [ 🔍 search ............................ ✕ ]
 *   [ Type ▾ ] [ Sort ▾ ] [ ⇅ order ] [ Unread ] [ Reset ]
 *
 * - Search (`q`) is the only debounced field upstream.
 * - Type is a single-select dropdown; empty = all.
 * - Sort-by + sort-order are two controls — order toggles independently.
 * - "Unread" is a client-side filter (hides rows with 0 unread).
 */
export const ConversationFilters: React.FC<ConversationFiltersProps> = memo(({
  value,
  onChangeQ,
  onChangeType,
  onToggleUnread,
  onChangeSortBy,
  onChangeSortOrder,
  onReset,
  isDirty,
}) => {
  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none"
        />
        <input
          type="text"
          value={value.q}
          onChange={(e) => onChangeQ(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-9 pr-8 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors"
        />
        {value.q && (
          <button
            type="button"
            onClick={() => onChangeQ('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter / sort controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Type */}
        <FilterSelect
          label="Type"
          value={value.type ?? ''}
          onChange={(v) => onChangeType((v as ConversationTypeFilter) || null)}
          options={[
            { value: '', label: 'All types' },
            ...TYPE_OPTIONS.map((t) => ({ value: t, label: TYPE_LABELS[t] })),
          ]}
          active={value.type !== null}
        />

        {/* Sort by */}
        <FilterSelect
          label="Sort"
          value={value.sortBy}
          onChange={(v) => onChangeSortBy(v as ConversationSortBy)}
          options={SORT_BY_OPTIONS.map((s) => ({ value: s, label: SORT_BY_LABELS[s] }))}
          active={value.sortBy !== 'activity'}
        />

        {/* Sort order toggle */}
        <button
          type="button"
          onClick={() => onChangeSortOrder(value.sortOrder === 'desc' ? 'asc' : 'desc')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:border-white/[0.12] text-[10px] font-semibold uppercase tracking-wide transition-colors"
          title={getSortOrderLabel(value.sortBy, value.sortOrder)}
          aria-label={`Sort order: ${getSortOrderLabel(value.sortBy, value.sortOrder)}`}
        >
          {value.sortOrder === 'desc' ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />}
          <span className="hidden sm:inline">
            {getSortOrderLabel(value.sortBy, value.sortOrder)}
          </span>
        </button>

        {/* Unread only */}
        <button
          type="button"
          onClick={() => onToggleUnread(!value.unreadOnly)}
          className={[
            'inline-flex items-center px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-colors',
            value.unreadOnly
              ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-300'
              : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:border-white/[0.12]',
          ].join(' ')}
          aria-pressed={value.unreadOnly}
        >
          Unread only
        </button>

        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto text-[10px] text-white/40 hover:text-white/80 transition-colors px-2 py-1"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
});

ConversationFilters.displayName = 'ConversationFilters';

// ── Internal select primitive ────────────────────────────────────────────────

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  options:  ReadonlyArray<FilterSelectOption>;
  active:   boolean;
}

/**
 * Compact styled `<select>` — keeps native keyboard / a11y behaviour while
 * matching the filter row's chip aesthetic. Label sits as a prefix so users
 * understand which axis the dropdown controls even when collapsed.
 */
const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options, active }) => (
  <label
    className={[
      'inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer',
      active
        ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
        : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:border-white/[0.12]',
    ].join(' ')}
  >
    <span className="text-white/30">{label}:</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent outline-none appearance-none pr-5 cursor-pointer text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff80\' stroke-width=\'2\'><polyline points=\'6 9 12 15 18 9\'/></svg>")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right center',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#0c0c0f] text-white normal-case">
          {opt.label}
        </option>
      ))}
    </select>
  </label>
);
