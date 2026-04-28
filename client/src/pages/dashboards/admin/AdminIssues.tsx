import { ShieldAlert } from 'lucide-react';
import { SupportPage } from '../../../components/dashboard/index.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';

export const AdminIssues = () => {
  useDocumentTitle('Support Issues');
  return (
    <SupportPage
      title="Support"
      accent="Tickets"
      accentColor="text-accent-pink"
      subtitle="Manage and resolve support tickets."
      icon={<ShieldAlert className="text-accent-pink" size={40} />}
      adminMode
    />
  );
};
