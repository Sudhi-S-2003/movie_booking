import { Route, Navigate } from 'react-router-dom';
import { AdminOverview } from '../pages/dashboards/admin/AdminOverview.js';
import { AdminMovies } from '../pages/dashboards/admin/AdminMovies.js';
import { AdminTheatres } from '../pages/dashboards/admin/AdminTheatres.js';
import { AdminUsers } from '../pages/dashboards/admin/AdminUsers.js';
import { AdminSubscriptionRequests } from '../pages/dashboards/admin/AdminSubscriptionRequests.js';
import { AdminIssues } from '../pages/dashboards/admin/AdminIssues.js';
import { AdminLayout } from '../layouts/AdminLayout.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { CommonDashboardRoutes } from './CommonDashboardRoutes.js';

export const AdminRoutes = () => (
  <Route
    path="/admin"
    element={
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="overview" replace />} />
    <Route path="overview" element={<AdminOverview />} />
    <Route path="movies" element={<AdminMovies />} />
    <Route path="theatres" element={<AdminTheatres />} />
    <Route path="users" element={<AdminUsers />} />
    <Route path="issues" element={<AdminIssues />} />
    <Route path="issues/:issueId" element={<AdminIssues />} />
    <Route path="subscription-requests" element={<AdminSubscriptionRequests />} />
    {CommonDashboardRoutes()}
    <Route path="settings" element={<div className="flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-[0.5em]">System Settings Hub Coming Soon</div>} />
  </Route>
);
