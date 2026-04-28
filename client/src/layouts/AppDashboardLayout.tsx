import React from 'react';
import { Outlet } from 'react-router-dom';
import { Search, Bell, HelpCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout.js';

import { NotificationRequest } from '../components/notifications/NotificationRequest.js';

interface AppDashboardLayoutProps {
  sidebar: React.ReactNode;
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  searchPlaceholder?: string;
}

export const AppDashboardLayout: React.FC<AppDashboardLayoutProps> = ({
  sidebar,
  wrapper: Wrapper,
  searchPlaceholder = 'Search movies, theatres, IDs...',
}) => {
  const content = (
    <DashboardLayout sidebar={sidebar}>
      {/* Top bar — leaves room for the hamburger (visible only below LG, fixed
          top-left). Below LG we add a left gutter so the search doesn't sit
          under the hamburger. */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2 flex-shrink-0 pl-12 lg:pl-0">
        <div className="relative group max-w-sm w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-blue transition-colors" size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full bg-white/5 border border-white/10 py-2.5 pl-12 pr-5 rounded-xl outline-none focus:border-accent-blue/50 focus:bg-white/10 transition-all font-medium text-xs"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationRequest variant="icon" />
          <button className="hidden sm:flex w-9 h-9 items-center justify-center bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all hover:bg-white/10">
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      <Outlet />
    </DashboardLayout>
  );

  return Wrapper ? <Wrapper>{content}</Wrapper> : content;
};
