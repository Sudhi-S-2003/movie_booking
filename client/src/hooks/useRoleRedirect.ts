import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { dashboardPrefix } from '../features/platform/useAccount.js';

/** Dashboard areas that are role-based (the movie-operator `/owner` area is permission-based). */
const ROLE_AREAS = ['/admin', '/user'] as const;

/**
 * Sections that exist in every dashboard area. Only these are rewritten,
 * so public pages that share a prefix (e.g. `/user/:username` profiles) are
 * never touched.
 */
const SHARED_SECTIONS = new Set([
  // 'pricing' is intentionally absent: /pricing is the public price list.
  'services', 'billing', 'account', 'customers', 'platform', 'applications', 'audit',
  'chat', 'api-keys', 'api-docs', 'integrations', 'chatbots', 'security', 'settings',
]);

/** Root-level public routes under shared names that must not be redirected. */
const isPublicChatRoute = (path: string, search: string) =>
  path.startsWith('/chat/g/') || path.startsWith('/chat/invite/') ||
  (path.startsWith('/chat/') && new URLSearchParams(search).has('signature'));

/**
 * Sends signed-in users to their own dashboard area:
 *  - `/billing` → `/user/billing` (or `/admin/billing` for staff)
 *  - `/admin/chat` opened by a customer → `/user/chat`
 */
export const useRoleRedirect = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const { pathname, search } = location;
    if (isPublicChatRoute(pathname, search)) return;

    const prefix = dashboardPrefix(user.role);
    const [, first = '', second = ''] = pathname.split('/');

    // 1. Shorthand: /<section>/... → <prefix>/<section>/...
    if (SHARED_SECTIONS.has(first)) {
      navigate(`${prefix}${pathname}${search}`, { replace: true });
      return;
    }

    // 2. Another role's area, shared section only.
    const area = ROLE_AREAS.find((a) => a === `/${first}`);
    if (area && area !== prefix && SHARED_SECTIONS.has(second)) {
      navigate(`${prefix}${pathname.slice(area.length)}${search}`, { replace: true });
    }
  }, [user, isAuthenticated, location, navigate]);
};
