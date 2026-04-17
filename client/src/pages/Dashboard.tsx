import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export const Dashboard = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'theatre_owner':
      return <Navigate to="/owner" replace />;
    default:
      return <Navigate to="/user" replace />;
  }
};
