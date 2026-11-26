import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { dashboardPrefix } from '../features/platform/useAccount.js';

/** `/dashboard` → the signed-in user's own dashboard area. */
export const Dashboard = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPrefix(user?.role)} replace />;
};
