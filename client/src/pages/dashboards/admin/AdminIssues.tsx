import { ShieldAlert } from 'lucide-react';
import { SupportPage } from '../../../components/dashboard/index.js';
import { SEO } from '../../../components/common/SEO.js';

export const AdminIssues = () => {
  return (
    <>
      <SEO title="Admin Support Issues" description="Overview and management of all support tickets across the platform." />
      <SupportPage
      title="Support"
      accent="Tickets"
      accentColor="text-accent-pink"
      subtitle="Manage and resolve support tickets."
      icon={<ShieldAlert className="text-accent-pink" size={40} />}
      adminMode
    />
    </>
  );
};
