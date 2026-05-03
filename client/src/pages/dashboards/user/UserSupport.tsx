import { SupportPage } from '../../../components/dashboard/index.js';
import { SEO } from '../../../components/common/SEO.js';

export const UserSupport = () => {
  return (
    <>
      <SEO title="Support Hub" description="Get help with your bookings, account, or any other issues." />
      <SupportPage />
    </>
  );
};
