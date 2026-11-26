import { Route, Navigate } from 'react-router-dom';
import { AdminOverview } from '../pages/dashboards/admin/AdminOverview.js';
import { AdminMovies } from '../pages/dashboards/admin/AdminMovies.js';
import { AdminTheatres } from '../pages/dashboards/admin/AdminTheatres.js';
import { AdminUsers } from '../pages/dashboards/admin/AdminUsers.js';
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
    {CommonDashboardRoutes()}
    <Route path="settings" element={<Navigate to="../account" replace />} />
  </Route>
);
