import React from 'react';
import { Ticket, BarChart3, LifeBuoy, Settings, MessageCircle, KeyRound, Puzzle, ShieldCheck } from 'lucide-react';

import { AppDashboardLayout } from './AppDashboardLayout.js';
import { useAuthStore } from '../store/authStore.js';
import { DashboardSidebar, type SidebarConfig } from '../components/sidebar/index.js';

const useUserSidebarConfig = (): SidebarConfig => {
  const { logout } = useAuthStore();

  return {
    brand: {
      title: 'USER',
      accent: 'HUB',
      accentColor: 'text-accent-pink',
      subtitle: 'Premium Member',
      iconName: 'User',
      iconColor: 'text-accent-pink',
    },
    groups: [
      {
        label: 'Activities',
        items: [
          { icon: Ticket, label: 'My Tickets', to: '/user/bookings', colorClass: 'text-accent-blue' },
          { icon: BarChart3, label: 'Stats', to: '/user/stats', colorClass: 'text-accent-pink' },
          { icon: ShieldCheck, label: 'Sessions', to: '/user/sessions', colorClass: 'text-emerald-400' },
        ],
      },
      {
        label: 'Social',
        items: [
          { icon: MessageCircle, label: 'Messages', to: '/user/chat', colorClass: 'text-emerald-400' },
        ],
      },
      {
        label: 'Developer',
        items: [
          { icon: KeyRound, label: 'API Keys', to: '/user/api-keys', colorClass: 'text-emerald-400' },
          { icon: Puzzle, label: 'Integrations', to: '/user/integrations', colorClass: 'text-accent-purple' },
        ],

      },
      {
        label: 'Help',
        items: [
          { icon: LifeBuoy, label: 'Support', to: '/user/support', colorClass: 'text-accent-purple' },
        ],
      },
    ],
    bottomItems: [
      { icon: Settings, label: 'Settings', to: '/user/settings', colorClass: 'text-gray-400' },
    ],
    showLogout: true,
    onLogout: logout,
    pillId: 'user-pill',
  };
};

export const UserLayout: React.FC = () => {
  const config = useUserSidebarConfig();
  return (
    <AppDashboardLayout
      sidebar={<DashboardSidebar config={config} />}
      searchPlaceholder="Search your bookings, movies..."
    />
  );
};
