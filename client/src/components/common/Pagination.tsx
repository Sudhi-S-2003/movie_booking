import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  accentColor?: 'accent-blue' | 'accent-pink' | 'accent-purple';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  accentColor = 'accent-blue',
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showMax = 7;

    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const accentClasses = {
    'accent-blue': 'bg-accent-blue shadow-accent-blue/20',
    'accent-pink': 'bg-accent-pink shadow-accent-pink/20',
    'accent-purple': 'bg-accent-purple shadow-accent-purple/20',
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8 pb-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-2">
        {getPageNumbers().map((page, i) => {
          if (page === '...') {
            return (
              <span key={`dots-${i}`} className="text-gray-600 px-1 font-black">
                ...
              </span>
            );
          }

          const isCurrent = currentPage === page;

          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              disabled={isLoading}
              className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all ${
                isCurrent
                  ? `${accentClasses[accentColor]} text-white shadow-lg`
                  : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};
