import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const ROLE_PREFIXES: Record<string, string> = {
  admin: '/admin',
  theatre_owner: '/owner',
  user: '/user',
};

/**
 * Paths that exist under all role prefixes. 
 * If a user accesses these at the root (e.g. /integrations), 
 * we redirect them to their role-specific version (e.g. /admin/integrations).
 */
const SHORTHAND_PATHS = [
  '/integrations',
  '/api-docs',
  '/api-keys',
  '/chat',
  '/settings',
  '/overview',
];

export const useRoleRedirect = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const currentPath = location.pathname;
    const userRole = user.role;
    const correctPrefix = ROLE_PREFIXES[userRole];

    if (!correctPrefix) return;

    // 1. Handle Shorthand Redirects (e.g. /integrations -> /admin/integrations)
    const isShorthand = SHORTHAND_PATHS.some(path => currentPath === path || currentPath.startsWith(`${path}/`));
    
    if (isShorthand) {
      const newPath = `${correctPrefix}${currentPath}`;
      console.log(`[RoleRedirect] Shorthand redirect for ${userRole}: ${currentPath} -> ${newPath}`);
      navigate(newPath, { replace: true });
      return;
    }

    // 2. Handle Cross-Role Prefix Redirects (e.g. /owner/chat -> /admin/chat for an admin)
    const prefixes = Object.values(ROLE_PREFIXES);
    const matchedPrefix = prefixes.find(
      (prefix) => currentPath.startsWith(prefix) && prefix !== correctPrefix
    );

    if (matchedPrefix) {
      const subPath = currentPath.substring(matchedPrefix.length);
      const newPath = `${correctPrefix}${subPath}`;
      console.log(`[RoleRedirect] Role mismatch redirect for ${userRole}: ${currentPath} -> ${newPath}`);
      navigate(newPath, { replace: true });
    }
  }, [user, isAuthenticated, location.pathname, navigate]);
};

