import React from 'react';

interface SidebarGroupProps {
  label: string;
  children: React.ReactNode;
}

export const SidebarGroup: React.FC<SidebarGroupProps> = ({ label, children }) => (
  <div>
    <div className="px-3 mb-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    </div>
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);
