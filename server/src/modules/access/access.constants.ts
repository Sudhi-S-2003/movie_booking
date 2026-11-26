import { UserRole } from '../../constants/enums.js';

/**
 * Permission catalog. Permissions are checked server-side only; the client
 * receives the effective list purely to decide what to render.
 *
 * Scope rules (enforced in access.service `canManageUser`):
 *   - Resellers' user/wallet/service permissions apply only to their own
 *     subtree (customers and sub-resellers below them).
 *   - Admins act platform-wide but never on other staff or protected accounts.
 *   - Super admin holds the wildcard, so permissions added later are included
 *     automatically.
 */
export const Permission = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_SUSPEND: 'users.suspend',
  USERS_CLOSE: 'users.close',
  USERS_IMPERSONATE_READ: 'users.read_all',

  RESELLERS_PROMOTE: 'resellers.promote',
  RESELLERS_CREATE_SUB: 'resellers.create_sub',
  STAFF_MANAGE: 'staff.manage',

  SERVICES_MANAGE: 'services.manage',
  SERVICES_ASSIGN: 'services.assign',

  PRICING_MANAGE: 'pricing.manage',
  PRICING_SET_CUSTOMER_MARKUP: 'pricing.customer_markup',
  /** Set the markup a specific reseller pays over base price. */
  PRICING_RESELLER_MARKUP: 'pricing.reseller_markup',
  /** Configure billing mode / credit limit of managed accounts. */
  BILLING_CUSTOMERS: 'billing.customers',

  WALLET_TRANSFER: 'wallet.transfer',
  WALLET_ADJUST: 'wallet.adjust',
  WALLET_MINT: 'wallet.mint',
  BILLING_MANAGE: 'billing.manage',
  BILLING_READ_ALL: 'billing.read_all',

  AUDIT_READ: 'audit.read',
  SUPPORT_MANAGE: 'support.manage',
  PLATFORM_SETTINGS: 'platform.settings',

  /** Movie service: operate theatres, screens and showtimes. */
  MOVIES_OPERATE: 'movies.operate',
  /** Movie service: manage the global movie catalog. */
  MOVIES_CATALOG: 'movies.catalog',
  /** Social service: moderate posts and comments. */
  SOCIAL_MODERATE: 'social.moderate',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(Permission);
export const WILDCARD = '*';

/** Default permissions per role. Super admin is the wildcard. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  [UserRole.SUPER_ADMIN]: [WILDCARD],
  [UserRole.ADMIN]: [
    Permission.USERS_READ, Permission.USERS_CREATE, Permission.USERS_UPDATE,
    Permission.USERS_SUSPEND, Permission.USERS_IMPERSONATE_READ,
    Permission.RESELLERS_PROMOTE, Permission.RESELLERS_CREATE_SUB,
    Permission.SERVICES_ASSIGN, Permission.WALLET_TRANSFER,
    Permission.BILLING_READ_ALL, Permission.BILLING_CUSTOMERS, Permission.PRICING_RESELLER_MARKUP,
    Permission.AUDIT_READ, Permission.SUPPORT_MANAGE,
    Permission.MOVIES_CATALOG, Permission.SOCIAL_MODERATE,
  ],
  [UserRole.RESELLER]: [
    Permission.USERS_READ, Permission.USERS_CREATE, Permission.USERS_UPDATE, Permission.USERS_SUSPEND,
    Permission.SERVICES_ASSIGN, Permission.PRICING_SET_CUSTOMER_MARKUP, Permission.WALLET_TRANSFER,
    Permission.BILLING_CUSTOMERS,
  ],
  [UserRole.USER]: [],
};

/**
 * Permissions that can never be granted as per-account extras — they are
 * reserved for the super admin (wildcard) so a compromised admin cannot
 * escalate by granting them.
 */
export const NON_GRANTABLE: ReadonlySet<string> = new Set([
  Permission.WALLET_MINT,
  Permission.STAFF_MANAGE,
  Permission.PLATFORM_SETTINGS,
  Permission.PRICING_MANAGE,
  Permission.BILLING_MANAGE,
  Permission.SERVICES_MANAGE,
  Permission.WALLET_ADJUST,
]);

/** Fields of a protected account that nobody may change through the API. */
export const PROTECTED_FIELDS = ['role', 'status', 'parentId', 'ancestors', 'isProtected', 'permissions', 'email'] as const;
