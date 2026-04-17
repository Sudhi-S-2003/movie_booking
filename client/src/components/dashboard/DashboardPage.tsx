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
        className={`flex items-start justify-between gap-4 ${
          isContained ? 'flex-shrink-0 mb-5' : ''
        }`}
      >
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            {icon}
            {renderedTitle}
            {badge && (
              <span className="text-[9px] font-bold text-accent-pink tracking-widest px-2.5 py-0.5 bg-accent-pink/10 rounded-full">
                {badge}
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1.5 font-medium">{subtitle}</p>
          )}
        </div>
        {headerActions && <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>}
      </div>

      {}
      {children}
    </motion.div>
  );
};
