import React from 'react';
import { BarChart3, Layout as LayoutIcon, Clock, Settings, LifeBuoy, MessageCircle } from 'lucide-react';
import { AppDashboardLayout } from './AppDashboardLayout.js';
import { OwnerProvider } from '../pages/dashboards/owner/context/OwnerContext.js';
import { DashboardSidebar, type SidebarConfig } from '../components/sidebar/index.js';

const config: SidebarConfig = {
  brand: {
    title: 'OWNER',
    accent: 'HUB',
    accentColor: 'text-accent-pink',
    subtitle: 'Management Suite v2.0',
  },
  groups: [
    {
      label: 'Operations',
      items: [
        { icon: BarChart3, label: 'Dashboard', to: '/owner/overview', colorClass: 'text-accent-pink' },
        { icon: LayoutIcon, label: 'Architecture', to: '/owner/architecture', colorClass: 'text-accent-blue' },
        { icon: Clock, label: 'Timeline', to: '/owner/timeline', colorClass: 'text-accent-purple' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { icon: MessageCircle, label: 'Messages', to: '/owner/chat', colorClass: 'text-emerald-400' },
        { icon: LifeBuoy, label: 'Support Node', to: '/owner/support', colorClass: 'text-accent-blue' },
      ],
    },
  ],
  bottomItems: [
    { icon: Settings, label: 'Preferences', to: '/owner/settings', colorClass: 'text-gray-400' },
  ],
  pillId: 'owner-pill',
};

export const OwnerLayout: React.FC = () => (
  <AppDashboardLayout
    sidebar={<DashboardSidebar config={config} />}
    wrapper={OwnerProvider}
    searchPlaceholder="Search theatres, screens, showtimes..."
  />
);
