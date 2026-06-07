import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

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
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };

    // Need timeout so the click that opens the menu doesn't immediately close it
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 0);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const handleOpenNewTab = () => {
    // Generate full URL
    const fullUrl = window.location.origin + to;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
    closeContextMenu();
  };

  return (
    <>
      <NavLink
        to={to}
        onContextMenu={handleContextMenu}
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
      
      {contextMenu && createPortal(
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-[100] w-48 bg-[#111114] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden"
        >
          <button
            onClick={handleOpenNewTab}
            className="w-full px-4 py-2 text-left flex items-center gap-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ExternalLink size={14} />
            Open in new tab
          </button>
        </div>,
        document.body
      )}
    </>
  );
};
