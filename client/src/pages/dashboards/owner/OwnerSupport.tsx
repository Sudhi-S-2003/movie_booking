import { useOwner } from './context/OwnerContext.js';
import { SupportPage } from '../../../components/dashboard/index.js';
import { SEO } from '../../../components/common/SEO.js';

export const OwnerSupport = () => {
  const { selectedTheatreId, selectedScreenId } = useOwner();

  const metadata = {
    ...(selectedTheatreId && { theatreId: selectedTheatreId }),
    ...(selectedScreenId && { screenId: selectedScreenId }),
    url: window.location.href,
  };

  return (
    <>
      <SEO title="Partner Support" description="Get technical support for your theatre and screen management." />
      <SupportPage
      title="Support"
      accent="Node"
      accentColor="text-accent-blue"
      subtitle="Direct connection to technical cinematographic orchestration teams."
      contextMetadata={metadata}
      />
    </>
  );
};
