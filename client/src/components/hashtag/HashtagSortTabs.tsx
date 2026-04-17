import { Clock, Flame, MessageCircle } from 'lucide-react';

export type SortMode = 'latest' | 'top' | 'most_commented';

interface HashtagSortTabsProps {
  sort:   SortMode;
  onSort: (sort: SortMode) => void;
  typing: string | null;
}

const SortTab = ({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
      active ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
    }`}
  >
    {icon}
    {children}
  </button>
);

export const HashtagSortTabs = ({ sort, onSort, typing }: HashtagSortTabsProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
      <SortTab active={sort === 'latest'} onClick={() => onSort('latest')} icon={<Clock size={14} />}>
        Latest
      </SortTab>
      <SortTab active={sort === 'top'} onClick={() => onSort('top')} icon={<Flame size={14} />}>
        Top
      </SortTab>
      <SortTab active={sort === 'most_commented'} onClick={() => onSort('most_commented')} icon={<MessageCircle size={14} />}>
        Most Commented
      </SortTab>
    </div>
    {typing && <span className="text-xs text-gray-500 italic">{typing} is writing…</span>}
  </div>
);
