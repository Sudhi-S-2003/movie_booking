import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout.js';
import { NotificationSetup } from '../components/notifications/NotificationSetup.js';
import { BalanceBadge } from '../components/chat/components/BalanceBadge.js';
import { usePresence } from '../hooks/usePresence.js';
import { useAuthStore } from '../store/authStore.js';
import { dashboardPrefix } from '../features/platform/useAccount.js';

interface AppDashboardLayoutProps {
  sidebar: React.ReactNode;
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Shared dashboard shell: sidebar + a compact top bar (wallet balance,
 * notifications, help) + the routed page. Every role's area uses it, so
 * spacing and typography stay consistent across dashboards.
 */
export const AppDashboardLayout: React.FC<AppDashboardLayoutProps> = ({ sidebar, wrapper: Wrapper }) => {
  usePresence();
  const role = useAuthStore((s) => s.user?.role);
  const supportPath = role === 'super_admin' || role === 'admin' ? '/admin/issues' : `${dashboardPrefix(role)}/support`;

  const content = (
    <DashboardLayout sidebar={sidebar}>
      {/* Top bar. Leaves a left gutter below LG for the fixed hamburger button. */}
      <div className="mb-4 sm:mb-5 flex items-center justify-end gap-2 flex-shrink-0 pl-12 lg:pl-0 min-h-9">
        <BalanceBadge />
        <NotificationSetup />
        <Link
          to={supportPath}
          aria-label="Help & support"
          title="Help & support"
          className="flex w-9 h-9 items-center justify-center bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors hover:bg-white/10"
        >
          <HelpCircle size={16} aria-hidden />
        </Link>
      </div>

      <Outlet />
    </DashboardLayout>
  );

  return Wrapper ? <Wrapper>{content}</Wrapper> : content;
};
