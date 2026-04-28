import React from 'react';
import { BarChart3, Layout as LayoutIcon, Clock, Settings, LifeBuoy, MessageCircle, KeyRound, Puzzle, ShieldCheck } from 'lucide-react';

import { AppDashboardLayout } from './AppDashboardLayout.js';
import { OwnerProvider } from '../pages/dashboards/owner/context/OwnerContext.js';
import { DashboardSidebar, type SidebarConfig } from '../components/sidebar/index.js';

import { useAuthStore } from '../store/authStore.js';

const config: SidebarConfig = {
  brand: {
    title: 'OWNER',
    accent: 'HUB',
    accentColor: 'text-accent-pink',
    subtitle: 'Theatre Management',
  },
  groups: [
    {
      label: 'Operations',
      items: [
        { icon: BarChart3, label: 'Dashboard', to: '/owner/overview', colorClass: 'text-accent-pink' },
        { icon: LayoutIcon, label: 'Screens', to: '/owner/architecture', colorClass: 'text-accent-blue' },
        { icon: Clock, label: 'Showtimes', to: '/owner/timeline', colorClass: 'text-accent-purple' },
        { icon: ShieldCheck, label: 'Sessions', to: '/owner/sessions', colorClass: 'text-emerald-400' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { icon: MessageCircle, label: 'Messages', to: '/owner/chat', colorClass: 'text-emerald-400' },
        { icon: LifeBuoy, label: 'Support', to: '/owner/support', colorClass: 'text-accent-blue' },
      ],
    },
    {
      label: 'Developer',
      items: [
        { icon: KeyRound, label: 'API Keys', to: '/owner/api-keys', colorClass: 'text-emerald-400' },
        { icon: Puzzle, label: 'Integrations', to: '/owner/integrations', colorClass: 'text-accent-purple' },
      ],
    },

  ],
  bottomItems: [
    { icon: Settings, label: 'Settings', to: '/owner/settings', colorClass: 'text-gray-400' },
  ],
  pillId: 'owner-pill',
};

export const OwnerLayout: React.FC = () => {
  const { logout } = useAuthStore();

  return (
    <AppDashboardLayout
      sidebar={<DashboardSidebar config={{ ...config, showLogout: true, onLogout: logout }} />}
      wrapper={OwnerProvider}
      searchPlaceholder="Search theatres, screens, showtimes..."
    />
  );
};
