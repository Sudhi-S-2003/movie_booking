import React from 'react';
import { BarChart3, Film, MapPin, Users, Settings, LifeBuoy, MessageCircle, KeyRound, Puzzle } from 'lucide-react';

import { AppDashboardLayout } from './AppDashboardLayout.js';
import { DashboardSidebar, type SidebarConfig } from '../components/sidebar/index.js';

const config: SidebarConfig = {
  brand: {
    title: 'OPS',
    accent: 'CENTER',
    accentColor: 'text-accent-blue/80',
    subtitle: 'Global Management v3.1',
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
      label: 'Inventory',
      items: [
        { icon: Film, label: 'Movie Catalogue', to: '/admin/movies', colorClass: 'text-accent-pink' },
        { icon: MapPin, label: 'Theatre Network', to: '/admin/theatres', colorClass: 'text-accent-purple' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { icon: Users, label: 'User Directory', to: '/admin/users', colorClass: 'text-accent-blue' },
        { icon: MessageCircle, label: 'Messages', to: '/admin/chat', colorClass: 'text-emerald-400' },
        { icon: LifeBuoy, label: 'Support Node', to: '/admin/issues', colorClass: 'text-accent-pink' },
      ],
    },
    {
      label: 'Developer',
      items: [
        { icon: KeyRound, label: 'API Keys', to: '/admin/api-keys', colorClass: 'text-emerald-400' },
        { icon: Puzzle, label: 'Integrations', to: '/admin/integrations', colorClass: 'text-accent-purple' },
      ],
    },

  ],
  bottomItems: [
    { icon: Settings, label: 'System Config', to: '/admin/settings', colorClass: 'text-gray-400' },
  ],
  pillId: 'admin-pill',
};

export const AdminLayout: React.FC = () => (
  <AppDashboardLayout
    sidebar={<DashboardSidebar config={config} />}
    searchPlaceholder="Search global network (Movies, Theatres, IDs)..."
  />
);
