import { Routes, Route, Navigate } from 'react-router-dom';
import { ApiKeyChat } from '../pages/ApiKeyChat.js';
import { CodeShare } from '../pages/CodeShare.js';
import { CodeShareV2 } from '../pages/CodeShareV2.js';
import { PublicRoutes } from './PublicRoutes.js';
import { OwnerRoutes } from './OwnerRoutes.js';
import { AdminRoutes } from './AdminRoutes.js';
import { UserRoutes } from './UserRoutes.js';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/chat/:conversationId" element={<ApiKeyChat />} />
      <Route path="/code-share/:id" element={<CodeShare />} />
      <Route path="/code-share-v2/:id" element={<CodeShareV2 />} />

      {PublicRoutes()}
      {OwnerRoutes()}
      {AdminRoutes()}
      {UserRoutes()}

      <Route path="/my-bookings" element={<Navigate to="/user/bookings" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
