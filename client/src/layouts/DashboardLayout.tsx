import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Responsive dashboard shell.
 *
 *   • LG+ (≥ 1024 px): permanent sidebar + main content side-by-side.
 *   • Below LG:         sidebar hides; a hamburger button in the top-left
 *                       opens it as an overlay drawer. Click-outside or
 *                       Escape closes; route changes also close (handled by
 *                       each layout by calling close() on navigation — or
 *                       via the `location` effect below).
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape to close.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Close on resize up to LG (desktop sidebar takes over).
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setDrawerOpen(false); };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Lock body scroll while the drawer is open on small screens.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  return (
    <div className="h-[100dvh] bg-[#050505] text-white flex overflow-hidden">
      {/* ── Desktop sidebar (LG+) ────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-white/5 py-6 px-4 flex-col gap-1 relative bg-gradient-to-b from-[#0a0a0a] to-[#080808] z-20 shadow-2xl overflow-y-auto custom-scrollbar">
        {sidebar}
      </aside>

      {/* ── Mobile drawer (below LG) ─────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="lg:hidden fixed inset-y-0 left-0 w-[min(82vw,300px)] border-r border-white/5 py-6 px-4 flex flex-col gap-1 bg-gradient-to-b from-[#0a0a0a] to-[#080808] z-50 shadow-2xl overflow-y-auto custom-scrollbar"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
            role="dialog"
            aria-label="Navigation menu"
          >
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
            {/* Close on any nav click — sidebar content typically contains <Link>s */}
            <div onClick={(e) => {
              const el = e.target as HTMLElement;
              if (el.closest('a') || el.closest('button[data-nav]')) setDrawerOpen(false);
            }}>
              {sidebar}
            </div>
          </aside>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto relative z-10 custom-scrollbar">
        {/* Hamburger (below LG only) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
          aria-label="Open menu"
          style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <Menu size={18} />
        </button>

        <div className="p-3 sm:p-5 lg:p-8 w-full h-full relative flex flex-col">
          {children}
        </div>

        {/* Ambient background blobs — cheap to render, skipped on tiny screens */}
        <div className="hidden md:block fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent-blue/5 blur-[160px] rounded-full -z-10 pointer-events-none animate-pulse" />
        <div className="hidden md:block fixed bottom-0 right-0 w-[600px] h-[600px] bg-accent-pink/5 blur-[160px] rounded-full -z-10 pointer-events-none animate-pulse delay-1000" />
      </main>
    </div>
  );
};
