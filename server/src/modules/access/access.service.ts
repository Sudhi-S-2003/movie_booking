import { UserRole, UserStatus } from '../../constants/enums.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { ROLE_PERMISSIONS, WILDCARD, NON_GRANTABLE, type Permission } from './access.constants.js';

/** Minimal shape of an account needed for access decisions. */
export type AccessSubject = Pick<IUser, '_id' | 'role' | 'permissions' | 'isProtected' | 'status' | 'ancestors'>;

const idOf = (v: unknown): string => String(v);

/** Role defaults plus per-account grants. */
export const effectivePermissions = (user: Pick<IUser, 'role' | 'permissions'>): string[] => {
  const base = ROLE_PERMISSIONS[user.role] ?? [];
  if (base.includes(WILDCARD)) return [WILDCARD];
  return [...new Set([...base, ...(user.permissions ?? []).filter((p) => !NON_GRANTABLE.has(p))])];
};

export const hasPermission = (user: Pick<IUser, 'role' | 'permissions'>, permission: Permission | string): boolean => {
  const perms = effectivePermissions(user);
  return perms.includes(WILDCARD) || perms.includes(permission);
};

export const isSuperAdmin = (user: Pick<IUser, 'role'>): boolean => user.role === UserRole.SUPER_ADMIN;
export const isStaff = (user: Pick<IUser, 'role'>): boolean =>
  user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

/** True when `target` sits anywhere below `owner` in the reseller tree. */
export const isInSubtree = (owner: { _id: unknown }, target: Pick<IUser, 'ancestors'>): boolean =>
  (target.ancestors ?? []).some((a) => idOf(a) === idOf(owner._id));

/**
 * Can `actor` manage (update/suspend/assign/transfer to) `target`?
 *
 *  - Nobody manages a protected account through the API (its owner may
 *    still edit their own profile via the self-service endpoints).
 *  - Nobody manages themselves through management endpoints.
 *  - Super admin: everyone else.
 *  - Admin: everyone except staff (other admins / super admins).
 *  - Reseller: only accounts in its own subtree.
 */
export const canManageUser = (actor: AccessSubject, target: AccessSubject): boolean => {
  if (actor.status !== UserStatus.ACTIVE) return false;
  if (target.isProtected) return false;
  if (idOf(actor._id) === idOf(target._id)) return false;
  if (actor.role === UserRole.SUPER_ADMIN) return true;
  if (actor.role === UserRole.ADMIN) return !isStaff(target);
  if (actor.role === UserRole.RESELLER) return isInSubtree(actor, target);
  return false;
};

/** Can `actor` read `target`'s account details? Managers plus self. */
export const canViewUser = (actor: AccessSubject, target: AccessSubject): boolean =>
  idOf(actor._id) === idOf(target._id) ||
  actor.role === UserRole.SUPER_ADMIN ||
  (actor.role === UserRole.ADMIN && hasPermission(actor, 'users.read_all')) ||
  (actor.role === UserRole.RESELLER && isInSubtree(actor, target));

/**
 * Mongo filter limiting a user listing to what `actor` may see.
 * Returns null when the actor may not list users at all.
 */
export const visibleUsersFilter = (actor: AccessSubject): Record<string, unknown> | null => {
  if (actor.role === UserRole.SUPER_ADMIN) return {};
  if (actor.role === UserRole.ADMIN) return hasPermission(actor, 'users.read_all') ? {} : null;
  if (actor.role === UserRole.RESELLER) return { ancestors: actor._id };
  return null;
};

/** Permissions `actor` may grant to others: only ones it holds itself, never reserved ones. */
export const canGrantPermission = (actor: Pick<IUser, 'role' | 'permissions'>, permission: string): boolean =>
  !NON_GRANTABLE.has(permission) && hasPermission(actor, permission);
