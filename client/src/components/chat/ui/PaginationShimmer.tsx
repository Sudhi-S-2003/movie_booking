import React from 'react';

interface PaginationShimmerProps {
  label: string;
}

/**
 * A polished shimmering indicator for background pagination.
 * Shows above/below the message list when fetching more history.
 */
export const PaginationShimmer: React.FC<PaginationShimmerProps> = ({ label }) => (
  <div className="flex items-center justify-center py-3 gap-2 select-none">
    {/* Animated shimmer dots */}
    <div className="flex items-center gap-[5px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[5px] h-[5px] rounded-full bg-white/30"
          style={{
            animation: 'chat-bounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
    <span className="text-[10px] font-medium text-white/30 tracking-wider uppercase">
      {label}
    </span>
    <style>{`
      @keyframes chat-bounce {
        0%, 80%, 100% { transform: scaleY(1); opacity: 0.3; }
        40%            { transform: scaleY(1.7); opacity: 0.7; }
      }
    `}</style>
  </div>
);
