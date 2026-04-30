import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { EmptyState } from '../browse/EmptyState.js';

interface BrowseLayoutProps {
  /** Hero */
  title: string;
  titleHighlight: string;
  subtitle: string;
  accentColor: 'blue' | 'pink';

  /** Filter bar — rendered between hero and results */
  filterBar: ReactNode;

  /** Results state */
  loading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  onReset: () => void;

  /** Loading skeleton config */
  skeletonCount?: number;
  skeletonClassName?: string;

  /** Result grid */
  children: ReactNode;

  /** Optional pagination component */
  pagination?: ReactNode;
}

const ACCENT = {
  blue: { bg: 'bg-accent-blue/5', text: 'text-accent-blue' },
  pink: { bg: 'bg-accent-pink/5', text: 'text-accent-pink' },
};

export const BrowseLayout = ({
  title,
  titleHighlight,
  subtitle,
  accentColor,
  filterBar,
  loading,
  isEmpty,
  emptyMessage,
  onReset,
  skeletonCount = 8,
  skeletonClassName = 'h-64 rounded-[50px]',
  children,
  pagination,
}: BrowseLayoutProps) => {
  const accent = ACCENT[accentColor];

  return (
    <div className="pb-32 space-y-10">
      {/* ── Hero ── */}
      <section className="relative h-[38vh] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-b-[80px] shadow-2xl flex items-center">
        <div className={`absolute inset-0 ${accent.bg} backdrop-blur-3xl`} />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10" />

        <div className="relative z-20 max-w-7xl mx-auto px-10 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h1 className="text-6xl sm:text-8xl font-black uppercase tracking-tighter text-white leading-[0.85]">
              {title} <br />
              <span className={accent.text}>{titleHighlight}</span>
            </h1>
            <p className="text-gray-400 font-medium max-w-sm italic">{subtitle}</p>
          </motion.div>
        </div>
      </section>

      {/* ── Filter bar ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filterBar}
      </section>

      {/* ── Results ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {[...Array(skeletonCount)].map((_, i) => (
                <div key={i} className={`bg-white/5 animate-pulse ${skeletonClassName}`} />
              ))}
            </motion.div>
          ) : isEmpty ? (
            <EmptyState key="empty" message={emptyMessage} onReset={onReset} />
          ) : (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination sits below results (hidden during load/empty) */}
        {!loading && !isEmpty && pagination}
      </section>
    </div>
  );
};
