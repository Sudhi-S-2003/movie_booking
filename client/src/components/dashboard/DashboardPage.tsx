import React from 'react';
import { motion } from 'framer-motion';

interface DashboardPageProps {
  title: string;
  accent?: string;
  accentColor?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  headerActions?: React.ReactNode;
  variant?: 'scroll' | 'contained';
  children: React.ReactNode;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  title,
  accent,
  accentColor = 'text-accent-blue',
  subtitle,
  icon,
  badge,
  headerActions,
  variant = 'scroll',
  children,
}) => {
  const renderedTitle = accent ? (
    <>
      {title} <span className={accentColor}>{accent}</span>
    </>
  ) : (
    title
  );

  const isContained = variant === 'contained';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        isContained
          ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
          : 'space-y-6'
      }
    >
      {}
      <div
        className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 ${
          isContained ? 'flex-shrink-0 mb-5' : ''
        }`}
      >
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white">
            {icon}
            {renderedTitle}
            {badge && (
              <span className="text-[11px] font-semibold text-accent-pink px-2.5 py-0.5 bg-accent-pink/10 rounded-full">
                {badge}
              </span>
            )}
          </h1>
          {subtitle && (
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {headerActions && <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>}
      </div>

      {}
      {children}
    </motion.div>
  );
};
