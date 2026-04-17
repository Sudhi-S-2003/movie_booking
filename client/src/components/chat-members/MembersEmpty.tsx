import React, { memo } from 'react';
import { Users } from 'lucide-react';

/** Empty state for a page with no members (e.g. after removing the last one). */
export const MembersEmpty = memo(() => (
  <div className="p-20 text-center space-y-4">
    <Users size={48} className="mx-auto text-gray-800" />
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">
      No members found on this page
    </p>
  </div>
));

MembersEmpty.displayName = 'MembersEmpty';
