import { ShieldAlert } from 'lucide-react';
import { SupportPage } from '../../../components/dashboard/index.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';

export const AdminIssues = () => {
  useDocumentTitle('Issues — OpsCenter');
  return (
    <SupportPage
      title="Global Support"
      accent="Hub"
      accentColor="text-accent-pink"
      subtitle="Cross-Platform Assistance & Technical Resolution"
      icon={<ShieldAlert className="text-accent-pink" size={40} />}
      adminMode
    />
  );
};
