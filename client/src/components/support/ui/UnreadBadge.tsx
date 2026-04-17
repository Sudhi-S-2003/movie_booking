import React from "react";


export interface UnreadBadgeProps {
  count: number;
  compact?: boolean;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, compact = true }) => {
  if (!count || count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  if (compact) {
    return (
      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[8px] font-bold rounded-full bg-violet-500 text-white shadow-sm shadow-violet-500/40">
        {display}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-violet-500 text-white shadow-md shadow-violet-500/40">
      {display}
    </span>
  );
};
