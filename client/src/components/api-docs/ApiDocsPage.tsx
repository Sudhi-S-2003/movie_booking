import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';
import { GettingStarted } from './GettingStarted.js';
import { ManagementApi } from './ManagementApi.js';
import { GuestApi } from './GuestApi.js';
import { ImplementationGuide } from './ImplementationGuide.js';
import { Book, Key, MessageSquare, Code, ChevronRight, Menu, X } from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Book, component: GettingStarted },
  { id: 'management-api', label: 'Management API', icon: Key, component: ManagementApi },
  { id: 'guest-api', label: 'Guest API', icon: MessageSquare, component: GuestApi },
  { id: 'implementation', label: 'Implementation', icon: Code, component: ImplementationGuide },
];

const DocSidebar = ({ activeSection, onSelect }: { activeSection: string; onSelect: (id: string) => void }) => (
  <nav className="flex-shrink-0 w-full lg:w-64 space-y-2">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 px-4 mb-4">Documentation</p>
    {SECTIONS.map((s) => (
      <button
        key={s.id}
        onClick={() => onSelect(s.id)}
        className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 ${
          activeSection === s.id
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
            : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <s.icon size={16} className={activeSection === s.id ? 'text-blue-400' : 'group-hover:text-blue-400/50'} />
          <span className="text-xs font-bold">{s.label}</span>
        </div>
        {activeSection === s.id && <ChevronRight size={12} className="opacity-50" />}
      </button>
    ))}
    
    <div className="mt-8 pt-8 border-t border-white/5 px-4">
      <div className="group relative p-5 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 -m-4 w-24 h-24 bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
        <p className="relative text-[10px] font-black text-white uppercase tracking-wider mb-2">Need Help?</p>
        <p className="relative text-[10px] text-gray-500 leading-relaxed font-medium">
          Join our developer Discord or contact support for implementation assistance.
        </p>
      </div>
    </div>
  </nav>
);

export const ApiDocsPage = () => {
  useDocumentTitle('API Documentation — CinemaConnect');
  const [activeSection, setActiveSection] = useState('getting-started');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.2, rootMargin: '-10% 0px -70% 0px' }
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
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <DashboardPage
      title="API"
      accent="Docs"
      subtitle="The cinematic developer console for programmatic excellence."
      accentColor="text-blue-400"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          
          {/* Mobile Navigation Trigger */}
          <div className="lg:hidden sticky top-24 z-40 mb-8">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-between w-full p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-xl"
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = SECTIONS.find(s => s.id === activeSection)?.icon;
                  return Icon ? <Icon size={18} /> : null;
                })()}
                <span className="font-bold text-sm">{SECTIONS.find(s => s.id === activeSection)?.label}</span>
              </div>
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <DocSidebar activeSection={activeSection} onSelect={scrollTo} />
              </div>
            )}
          </div>

          {/* Desktop Sticky Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-32 h-[calc(100vh-160px)] overflow-y-auto scrollbar-none pb-12">
            <DocSidebar activeSection={activeSection} onSelect={scrollTo} />
          </aside>

          {/* Content Area */}
          <div className="flex-1 space-y-32 pb-32">
            {SECTIONS.map(({ id, component: Component }) => (
              <div key={id} id={id} className="scroll-mt-32">
                <Component />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardPage>
  );
};
