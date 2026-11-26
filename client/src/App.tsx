import { BrowserRouter } from 'react-router-dom';
import { BookingSessionProvider } from './providers/BookingSessionProvider.js';
import { BillingProvider } from './providers/BillingProvider.js';
import { NotificationRoot } from './components/notifications/NotificationRoot.js';
import { useRoleRedirect } from './hooks/useRoleRedirect.js';
import { ScrollToTop } from './components/common/ScrollToTop.js';
import { ToastContainer } from './components/common/ToastContainer.js';
import { SEO } from './components/common/SEO.js';
import { AppRoutes } from './routes/AppRoutes.js';

const RoleRedirectHandler = () => {
  useRoleRedirect();
  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RoleRedirectHandler />
      <SEO />
      <NotificationRoot />
      <BillingProvider>
        <BookingSessionProvider>
          <ToastContainer />
          <AppRoutes />
        </BookingSessionProvider>
      </BillingProvider>
    </BrowserRouter>
  );
};

export default App;