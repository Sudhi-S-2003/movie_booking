import React from 'react';
import { motion } from 'framer-motion';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="h-screen bg-[#050505] text-white flex overflow-hidden">
      
      {}
      <aside className="w-60 border-r border-white/5 py-6 px-4 flex flex-col gap-1 relative bg-gradient-to-b from-[#0a0a0a] to-[#080808] z-20 shadow-2xl shrink-0 overflow-y-auto custom-scrollbar">
        {sidebar}
      </aside>

      {}
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="p-8 w-full h-full relative flex flex-col">
          {children}
        </div>
        
        {}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent-blue/5 blur-[160px] rounded-full -z-10 pointer-events-none animate-pulse" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-accent-pink/5 blur-[160px] rounded-full -z-10 pointer-events-none animate-pulse delay-1000" />
      </main>
    </div>
  );
};
