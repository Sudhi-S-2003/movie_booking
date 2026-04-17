import React from 'react';
import { Ticket, BarChart3, LifeBuoy, Settings, MessageCircle } from 'lucide-react';
import { AppDashboardLayout } from './AppDashboardLayout.js';
import { useAuthStore } from '../store/authStore.js';
import { DashboardSidebar, type SidebarConfig } from '../components/sidebar/index.js';

const useUserSidebarConfig = (): SidebarConfig => {
  const { logout } = useAuthStore();

  return {
    brand: {
      title: 'MY',
      accent: 'SPACE',
      accentColor: 'text-accent-pink',
      subtitle: 'Premium Member',
      iconName: 'User',
      iconColor: 'text-accent-pink',
    },
    groups: [
      {
        label: 'Experience',
        items: [
          { icon: Ticket, label: 'My Tickets', to: '/user/bookings', colorClass: 'text-accent-blue' },
          { icon: BarChart3, label: 'Activity Stats', to: '/user/stats', colorClass: 'text-accent-pink' },
        ],
      },
      {
        label: 'Social',
        items: [
          { icon: MessageCircle, label: 'Messages', to: '/user/chat', colorClass: 'text-emerald-400' },
        ],
      },
      {
        label: 'Help',
        items: [
          { icon: LifeBuoy, label: 'Support Hub', to: '/user/support', colorClass: 'text-accent-purple' },
        ],
      },
    ],
    bottomItems: [
      { icon: Settings, label: 'Account Settings', to: '/user/settings', colorClass: 'text-gray-400' },
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
