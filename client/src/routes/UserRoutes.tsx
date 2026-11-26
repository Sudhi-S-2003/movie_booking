import { Route, Navigate } from 'react-router-dom';
import { UserBookings } from '../pages/dashboards/user/UserBookings.js';
import { UserStats } from '../pages/dashboards/user/UserStats.js';
import { UserSupport } from '../pages/dashboards/user/UserSupport.js';
import { UserLayout } from '../layouts/UserLayout.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { CommonDashboardRoutes } from './CommonDashboardRoutes.js';

export const UserRoutes = () => (
  <Route
    path="/user"
    element={
      <ProtectedRoute>
        <UserLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="bookings" replace />} />
    <Route path="bookings" element={<UserBookings />} />
    <Route path="stats" element={<UserStats />} />
    <Route path="support" element={<UserSupport />} />
    <Route path="support/:issueId" element={<UserSupport />} />
    {CommonDashboardRoutes()}
    <Route path="settings" element={<Navigate to="../account" replace />} />
  </Route>
);
