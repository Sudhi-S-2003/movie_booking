import React, { useState, useEffect } from 'react';
import { Book, Key, User, Terminal, Mail, MessageSquare, Code as CodeIcon } from 'lucide-react';
import { GettingStarted } from './GettingStarted';
import { ManagementApi } from './ManagementApi';
import { GuestApi } from './GuestApi';
import { ImplementationGuide } from './ImplementationGuide';
import { config } from '../../config.js';

const SECTIONS = [
  { id: 'getting-started', label: 'Start Here', icon: Book },
  { id: 'management-api', label: 'Admin API', icon: Key },
  { id: 'guest-api', label: 'Guest API', icon: User },
  { id: 'implementation-guide', label: 'Guide', icon: Terminal }
];

export const ApiDocsPage = () => {
  const [activeSection, setActiveSection] = useState(() => {
    // Determine initial active section from hash on first render
    const hash = window.location.hash.replace('#', '');
    return SECTIONS.some(s => s.id === hash) ? hash : 'getting-started';
  });

  useEffect(() => {
    let isInitialMount = true;

    // Check for initial hash on mount to trigger scroll
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && SECTIONS.some(s => s.id === initialHash)) {
      setTimeout(() => {
        const el = document.getElementById(initialHash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Allow hash updates after the initial scroll has had time to start
        setTimeout(() => { isInitialMount = false; }, 1000);
      }, 300);
    } else {
      isInitialMount = false;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the section that is most "prominent" or just the one currently intersecting
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // ONLY update state if we are not in the initial "forced" scroll phase
            if (!isInitialMount) {
              setActiveSection(entry.target.id);
              window.history.replaceState(null, '', `#${entry.target.id}`);
            }
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '-20% 0px -70% 0px' 
      }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Set active section immediately for better UI feedback
      setActiveSection(id);
      
      // Update hash in URL without jumping
      window.history.replaceState(null, '', `#${id}`);
      
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr] gap-16 relative min-h-full">
      {/* Sidebar - Side Navigation */}
      <aside className="w-full shrink-0 lg:h-full">
        <div className="lg:sticky lg:top-8 space-y-8 bg-[#050505]/80 backdrop-blur-xl lg:bg-transparent py-4 lg:py-0 border-b border-white/5 lg:border-none sticky top-0 z-30">
          <div className="hidden lg:block">
            <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
              <CodeIcon className="text-blue-500" size={24} />
              API Docs
            </h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Help & Guides</p>
          </div>

          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar px-4 lg:px-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl transition-all duration-300 text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 ${
                  activeSection === id 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:block p-6 bg-white/[0.02] border border-white/5 rounded-[32px] space-y-4">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={12} />
              Support
            </h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Need help with integration?
            </p>
            <button 
              onClick={() => window.location.href = `mailto:${config.supportEmail}`}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-2 group"
            >
              <Mail size={12} className="text-gray-400 group-hover:text-white transition-colors" />
              Email Us
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0">
        <div className="max-w-4xl space-y-32 pb-20">
          <header className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tightest">
              API Guide
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl font-medium">
              Everything you need to integrate our movie booking system.
            </p>
          </header>

          <div className="space-y-32">
            <GettingStarted />
            <ManagementApi />
            <GuestApi />
            <ImplementationGuide />
          </div>
        </div>
      </main>
    </div>
  );
};
