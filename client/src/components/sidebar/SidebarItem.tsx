import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  colorClass?: string;
  pillId?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  to,
  colorClass = 'text-accent-blue',
  pillId = 'sidebar-active-pill',
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
        isActive
          ? 'bg-white/10 text-white shadow-md border border-white/15'
          : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? colorClass : 'bg-white/5'}`}>
          <Icon size={16} />
        </div>
        <span className="font-bold text-[9px] uppercase tracking-widest">{label}</span>
        {isActive && (
          <motion.div
            layoutId={pillId}
            className="ml-auto w-1 h-3.5 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(0,186,255,0.6)]"
          />
        )}
      </>
    )}
  </NavLink>
);
