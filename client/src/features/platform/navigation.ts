import { Boxes, Wallet, CircleUser, Users, Tags, LayoutDashboard, BadgeCheck, ScrollText, Clapperboard } from 'lucide-react';
import type { SidebarNavGroup } from '../../components/sidebar/index.js';
import type { Account } from '../../types/platform.js';
import { can, isStaffRole } from './useAccount.js';

/**
 * Sidebar groups for the platform core, shared by every dashboard layout.
 * Items appear only when the account holds the matching permission; the
 * server enforces the same permissions on every request.
 */
export const platformNavGroups = (prefix: string, account: Account | undefined): SidebarNavGroup[] => {
  const groups: SidebarNavGroup[] = [
    {
      label: 'Platform',
      items: [
        { icon: Boxes, label: 'Services', to: `${prefix}/services`, colorClass: 'text-sky-300' },
        { icon: Wallet, label: 'Wallet & Billing', to: `${prefix}/billing`, colorClass: 'text-emerald-400' },
        { icon: CircleUser, label: 'My Account', to: `${prefix}/account`, colorClass: 'text-slate-300' },
      ],
    },
  ];
  if (!account) return groups;

  const business = [
    ...(can(account, 'users.read')
      ? [{ icon: Users, label: isStaffRole(account.role) ? 'Accounts' : 'Customers', to: `${prefix}/customers`, colorClass: 'text-accent-blue' }]
      : []),
    ...(can(account, 'pricing.customer_markup') || can(account, 'pricing.reseller_markup') || can(account, 'services.manage')
      ? [{ icon: Tags, label: 'Pricing', to: `${prefix}/pricing`, colorClass: 'text-accent-pink' }]
      : []),
  ];
  if (business.length) groups.push({ label: isStaffRole(account.role) ? 'Management' : 'My Business', items: business });

  const admin = [
    ...(isStaffRole(account.role) ? [{ icon: LayoutDashboard, label: 'Platform Overview', to: `${prefix}/platform`, colorClass: 'text-sky-300' }] : []),
    ...(can(account, 'resellers.promote') ? [{ icon: BadgeCheck, label: 'Reseller Applications', to: `${prefix}/applications`, colorClass: 'text-emerald-400' }] : []),
    ...(can(account, 'audit.read') ? [{ icon: ScrollText, label: 'Audit Log', to: `${prefix}/audit`, colorClass: 'text-slate-300' }] : []),
  ];
  if (admin.length) groups.push({ label: 'Administration', items: admin });

  if (can(account, 'movies.operate') && prefix !== '/owner') {
    groups.push({ label: 'Movie Operations', items: [{ icon: Clapperboard, label: 'Theatre Console', to: '/owner/overview', colorClass: 'text-accent-purple' }] });
  }
  return groups;
};
