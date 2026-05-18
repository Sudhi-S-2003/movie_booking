import React from 'react';
import { BarChart3, Film, MapPin, Users, Settings, LifeBuoy, MessageCircle, KeyRound, Puzzle, ShieldCheck } from 'lucide-react';

import { AppDashboardLayout } from './AppDashboardLayout.js';
import { DashboardSidebar, type SidebarConfig } from '../components/sidebar/index.js';

import { useLogout } from '../hooks/useLogout.js';

const config: SidebarConfig = {
  brand: {
    title: 'ADMIN',
    accent: 'HUB',
    accentColor: 'text-accent-blue/80',
    subtitle: 'Management Console',
    iconName: 'ShieldCheck',
    iconColor: 'text-accent-blue',
  },
  groups: [
    {
      label: 'Analytics',
      items: [
        { icon: BarChart3, label: 'Dashboard', to: '/admin/overview', colorClass: 'text-accent-blue' },
      ],
    },
    {
      label: 'Content',
      items: [
        { icon: Film, label: 'Movies', to: '/admin/movies', colorClass: 'text-accent-pink' },
        { icon: MapPin, label: 'Theatres', to: '/admin/theatres', colorClass: 'text-accent-purple' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { icon: Users, label: 'Users', to: '/admin/users', colorClass: 'text-accent-blue' },
        { icon: MessageCircle, label: 'Messages', to: '/admin/chat', colorClass: 'text-emerald-400' },
        { icon: LifeBuoy, label: 'Support', to: '/admin/issues', colorClass: 'text-accent-pink' },
      ],
    },
    {
      label: 'Developer',
      items: [
        { icon: KeyRound, label: 'API Keys', to: '/admin/api-keys', colorClass: 'text-emerald-400' },
        { icon: Puzzle, label: 'Integrations', to: '/admin/integrations', colorClass: 'text-accent-purple' },
      ],
    },
    {
      label: 'Security',
      items: [
        { icon: ShieldCheck, label: 'Security', to: '/admin/security', colorClass: 'text-accent-blue' },
      ],
    },
  ],
  bottomItems: [
    { icon: Settings, label: 'Settings', to: '/admin/settings', colorClass: 'text-gray-400' },
  ],
  pillId: 'admin-pill',
};

export const AdminLayout: React.FC = () => {
  const { logout, isLoading } = useLogout();
  
  return (
    <AppDashboardLayout
      sidebar={<DashboardSidebar config={{ ...config, showLogout: true, onLogout: logout, isLogoutLoading: isLoading }} />}
      searchPlaceholder="Search global network (Movies, Theatres, IDs)..."
    />
  );
};
