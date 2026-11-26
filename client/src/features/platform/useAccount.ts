import { useQuery } from '@tanstack/react-query';
import { accountApi } from '../../services/api/platform.api.js';
import { useAuthStore } from '../../store/authStore.js';
import type { Account, Role } from '../../types/platform.js';

export const ACCOUNT_QUERY_KEY = ['account', 'me'] as const;

/** The signed-in account with its effective permissions (server-computed). */
export const useAccount = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: accountApi.me,
    enabled: !!token,
    staleTime: 60_000,
  });
};

/**
 * Client-side permission check — for deciding what to RENDER only. Every
 * action is authorized again by the server.
 */
export const can = (account: Pick<Account, 'effectivePermissions'> | undefined, permission: string): boolean =>
  !!account && (account.effectivePermissions.includes('*') || account.effectivePermissions.includes(permission));

export const isStaffRole = (role: Role | undefined) => role === 'super_admin' || role === 'admin';
export const isResellerRole = (role: Role | undefined) => role === 'reseller' || role === 'super_admin';

/** Dashboard area for a role. Staff use /admin; resellers and users use /user. */
export const dashboardPrefix = (role: string | undefined): string =>
  role === 'super_admin' || role === 'admin' ? '/admin' : '/user';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Platform owner',
  admin: 'Admin',
  reseller: 'Reseller',
  user: 'Customer',
};
