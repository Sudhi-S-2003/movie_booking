import React, { memo } from 'react';

interface MembersSkeletonProps {
  rows?: number;
}

/** Loading placeholder rows for the members list. */
export const MembersSkeleton = memo(({ rows = 8 }: MembersSkeletonProps) => (
  <ul className="divide-y divide-white/[0.04]">
    {Array.from({ length: Math.min(rows, 8) }).map((_, i) => (
      <li key={i} className="flex items-center gap-5 px-10 py-6">
        <div className="w-10 h-10 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-2 w-1/4 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse hidden md:block" />
      </li>
    ))}
  </ul>
));

MembersSkeleton.displayName = 'MembersSkeleton';
