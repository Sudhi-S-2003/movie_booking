import { useOwner } from './context/OwnerContext.js';
import { SupportPage } from '../../../components/dashboard/index.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';

export const OwnerSupport = () => {
  useDocumentTitle('Support — OwnerHub');
  const { selectedTheatreId, selectedScreenId } = useOwner();

  const metadata = {
    ...(selectedTheatreId && { theatreId: selectedTheatreId }),
    ...(selectedScreenId && { screenId: selectedScreenId }),
    url: window.location.href,
  };

  return (
    <SupportPage
      title="Support"
      accent="Node"
      accentColor="text-accent-blue"
      subtitle="Direct connection to technical cinematographic orchestration teams."
      contextMetadata={metadata}
    />
  );
};
