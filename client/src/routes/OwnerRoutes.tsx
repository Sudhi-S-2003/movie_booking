import { Route, Navigate } from 'react-router-dom';
import { OwnerOverview } from '../pages/dashboards/owner/OwnerOverview.js';
import { OwnerArchitecture } from '../pages/dashboards/owner/OwnerArchitecture.js';
import { OwnerTimeline } from '../pages/dashboards/owner/OwnerTimeline.js';
import { OwnerSupport } from '../pages/dashboards/owner/OwnerSupport.js';
import { OwnerLayout } from '../layouts/OwnerLayout.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { CommonDashboardRoutes } from './CommonDashboardRoutes.js';

export const OwnerRoutes = () => (
  <Route
    path="/owner"
    element={
      <ProtectedRoute>
        <OwnerLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="overview" replace />} />
    <Route path="overview" element={<OwnerOverview />} />
    <Route path="architecture" element={<OwnerArchitecture />} />
    <Route path="timeline" element={<OwnerTimeline />} />
    <Route path="support" element={<OwnerSupport />} />
    <Route path="support/:issueId" element={<OwnerSupport />} />
    {CommonDashboardRoutes()}
    <Route path="settings" element={<div className="flex items-center justify-center h-full text-gray-500 font-black uppercase tracking-[0.5em]">Settings Module Coming Soon</div>} />
  </Route>
);
