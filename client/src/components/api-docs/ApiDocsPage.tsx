import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';
import { GettingStarted } from './GettingStarted.js';
import { ManagementApi } from './ManagementApi.js';
import { GuestApi } from './GuestApi.js';
import { ImplementationGuide } from './ImplementationGuide.js';
import { Book, Key, MessageSquare, Code, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Book, component: GettingStarted },
  { id: 'management-api', label: 'Management API', icon: Key, component: ManagementApi },
  { id: 'guest-api', label: 'Guest API', icon: MessageSquare, component: GuestApi },
  { id: 'implementation', label: 'Implementation', icon: Code, component: ImplementationGuide },
];

export const ApiDocsPage = () => {
  useDocumentTitle('API Documentation — CinemaConnect');
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <DashboardPage
      title="API"
      accent="Docs"
      subtitle="Comprehensive guide to our programmatic interfaces"
      accentColor="text-blue-400"
    >
      <div className="flex gap-12 relative max-w-7xl mx-auto">
        {/* Sticky Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-32 h-fit space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 px-4 mb-4">Documentation</p>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`w-full group flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                activeSection === s.id
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-3">
                <s.icon size={16} />
                <span className="text-xs font-bold">{s.label}</span>
              </div>
              {activeSection === s.id && <ChevronRight size={12} className="opacity-50" />}
            </button>
          ))}
          
          <div className="mt-8 pt-8 border-t border-white/5 px-4 space-y-4">
             <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-white/5">
                <p className="text-[10px] font-black text-white uppercase tracking-wider mb-1">Need Help?</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">Join our developer Discord or contact support.</p>
             </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 space-y-24 pb-32">
          {SECTIONS.map(({ id, component: Component }) => (
            <div key={id} id={id} className="scroll-mt-32">
              <Component />
            </div>
          ))}
        </div>
      </div>
    </DashboardPage>
  );
};

