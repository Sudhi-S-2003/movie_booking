import { Route, Navigate } from 'react-router-dom';
import { UserBookings } from '../pages/dashboards/user/UserBookings.js';
import { UserStats } from '../pages/dashboards/user/UserStats.js';
import { UserTransactions } from '../pages/dashboards/user/UserTransactions.js';
import { UserBilling } from '../pages/dashboards/user/UserBilling.js';
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
    <Route path="billing" element={<UserBilling />} />
    <Route path="transactions" element={<UserTransactions />} />
    <Route path="support" element={<UserSupport />} />
    <Route path="support/:issueId" element={<UserSupport />} />
    {CommonDashboardRoutes()}
    <Route path="settings" element={<div className="flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-[0.5em]">Account Settings Coming Soon</div>} />
  </Route>
);
