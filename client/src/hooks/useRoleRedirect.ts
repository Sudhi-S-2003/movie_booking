import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const ROLE_PREFIXES: Record<string, string> = {
  admin: '/admin',
  theatre_owner: '/owner',
  user: '/user',
};

export const useRoleRedirect = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const currentPath = location.pathname;
    const userRole = user.role;
    const correctPrefix = ROLE_PREFIXES[userRole];

    // Find if the current path starts with any of the OTHER role prefixes
    const prefixes = Object.values(ROLE_PREFIXES);
    const matchedPrefix = prefixes.find(
      (prefix) => currentPath.startsWith(prefix) && prefix !== correctPrefix
    );

    if (matchedPrefix) {
      // Extract the part of the path after the matched prefix
      // e.g., if path is /admin/chat and matchedPrefix is /admin, subPath is /chat
      const subPath = currentPath.substring(matchedPrefix.length);
      
      // Construct the new path
      // e.g., /owner + /chat = /owner/chat
      const newPath = `${correctPrefix}${subPath}`;
      
      console.log(`[RoleRedirect] Redirecting ${userRole} from ${currentPath} to ${newPath}`);
      navigate(newPath, { replace: true });
    }
  }, [user, isAuthenticated, location.pathname, navigate]);
};
