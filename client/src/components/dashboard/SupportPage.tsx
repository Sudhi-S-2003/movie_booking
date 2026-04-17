import React from 'react';
import { DashboardPage } from './DashboardPage.js';
import { IssueSuite } from '../support/IssueSuite.js';

interface SupportPageProps {
  title?: string;
  accent?: string;
  accentColor?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  adminMode?: boolean;
  contextMetadata?: Record<string, any>;
}

export const SupportPage: React.FC<SupportPageProps> = ({
  title = 'Support',
  accent = 'Hub',
  accentColor = 'text-accent-purple',
  subtitle = 'Get help with your bookings and account.',
  icon,
  adminMode = false,
  contextMetadata,
}) => (
  <DashboardPage
    title={title}
    accent={accent}
    accentColor={accentColor}
    subtitle={subtitle}
    icon={icon}
    variant="contained"
  >
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl">
      <IssueSuite adminMode={adminMode} contextMetadata={contextMetadata} />
    </div>
  </DashboardPage>
);
