import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Pagination } from '../../store/browseStore.js';

interface PaginationBarProps {
  pagination: Pagination;
  onChange: (page: number) => void;
}

export const PaginationBar = ({ pagination, onChange }: PaginationBarProps) => {
  const { page, totalPages, total } = pagination;
  if (totalPages <= 1) return null;

  // Build page number windows: always show first, last, and ±1 around current
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) pages.add(i);
  const pageList = [...pages].sort((a, b) => a - b);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between pt-4"
    >
      {/* Left: total */}
      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
        {total} results
      </span>

      {/* Center: page buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
        >
          <ChevronLeft size={16} />
        </button>

        {pageList.map((p, i) => {
          const prev = pageList[i - 1];
          const showEllipsis = prev !== undefined && p - prev > 1;
          return (
            <span key={p} className="flex items-center gap-2">
              {showEllipsis && (
                <span className="text-gray-700 text-xs select-none">…</span>
              )}
              <button
                onClick={() => onChange(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all active:scale-90 ${
                  p === page
                    ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/30'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            </span>
          );
        })}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Right: page x of y */}
      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
        Page {page} / {totalPages}
      </span>
    </motion.div>
  );
};
