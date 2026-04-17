import React from 'react';

interface SidebarGroupProps {
  label: string;
  children: React.ReactNode;
}

export const SidebarGroup: React.FC<SidebarGroupProps> = ({ label, children }) => (
  <div>
    <div className="px-4 mb-3">
      <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
    </div>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);
