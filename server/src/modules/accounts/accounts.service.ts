import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import type { Request } from 'express';
import { User } from '../../models/user.model.js';
import { Session } from '../../models/session.model.js';
import { AuthProvider, UserRole, UserStatus } from '../../constants/enums.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { Errors } from '../../core/http/errors.js';
import { definedOnly } from '../../utils/object.util.js';
import {
  canManageUser, canViewUser, canGrantPermission, effectivePermissions, hasPermission,
  visibleUsersFilter, type AccessSubject,
} from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';
import { audit } from '../audit/audit.service.js';
import { ResellerApplication, ApplicationStatus } from './resellerApplication.model.js';
import { grantInitialServices } from '../catalog/entitlement.service.js';
import { ensureBillingAccount } from '../billing/billingAccount.service.js';
import { disconnectSessionSockets } from '../../socket/index.js';
import type { z } from 'zod';
import type {
  createUserSchema, listUsersQuerySchema, updateUserSchema, updateMeSchema,
  changeRoleSchema, resellerApplicationSchema, decideApplicationSchema,
} from './accounts.schemas.js';

type Actor = AccessSubject & Pick<IUser, 'name'>;
type Ctx = Pick<Request, 'user' | 'ip' | 'socket' | 'headers'>;

const SAFE_FIELDS = '-password -twoFactorSecret -twoFactorBackupCodes';

/** Public shape of an account returned by management endpoints. */
export const toAccountDto = (u: IUser & { _id: unknown }) => ({
  id: String(u._id),
  name: u.name,
  username: u.username,
  email: u.email,
  role: u.role,
  status: u.status,
  parentId: u.parentId ? String(u.parentId) : null,
  isProtected: u.isProtected,
  permissions: u.permissions ?? [],
  effectivePermissions: effectivePermissions(u),
  resellerCode: u.resellerCode ?? null,
  brandName: u.brandName ?? null,
  avatar: u.avatar ?? null,
  phoneNumber: u.phoneNumber ?? null,
  twoFactorEnabled: !!u.twoFactorEnabled,
  suspendedReason: u.suspendedReason ?? null,
  isOnline: u.isOnline,
  lastSeen: u.lastSeen,
  createdAt: (u as { createdAt?: Date }).createdAt,
});

const loadTarget = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw Errors.notFound('User');
  const target = await User.findById(id).select(SAFE_FIELDS);
  if (!target) throw Errors.notFound('User');
  return target;
};

const requireManageable = async (actor: Actor, id: string) => {
  const target = await loadTarget(id);
  if (target.isProtected) throw Errors.forbidden('This account is protected and cannot be modified');
  if (!canManageUser(actor, target)) throw Errors.notFound('User');
  return target;
};

/** End every session of a user and drop their live sockets. */
const revokeAllSessions = async (userId: mongoose.Types.ObjectId) => {
  const sessions = await Session.find({ userId, isValid: true }).select('_id');
  await Session.updateMany({ userId, isValid: true }, { $set: { isValid: false }, $unset: { refreshToken: 1 } });
  for (const s of sessions) disconnectSessionSockets(String(s._id));
};

// ─── Self-service ───────────────────────────────────────────────────────────

export const getMe = async (userId: string) => {
  const user = await User.findById(userId).select(SAFE_FIELDS);
  if (!user) throw Errors.notFound('User');
  const parent = user.parentId ? await User.findById(user.parentId).select('name brandName') : null;
  return { ...toAccountDto(user), provider: parent ? { id: String(parent._id), name: parent.brandName || parent.name } : null };
};

export const updateMe = async (ctx: Ctx, userId: string, input: z.infer<typeof updateMeSchema>) => {
  const user = await User.findById(userId).select(SAFE_FIELDS);
  if (!user) throw Errors.notFound('User');
  if (input.brandName !== undefined && user.role !== UserRole.RESELLER && user.role !== UserRole.SUPER_ADMIN) {
    throw Errors.forbidden('Only resellers can set a brand name');
  }
  Object.assign(user, definedOnly(input));
  await user.save();
  await audit(ctx, { action: 'account.update_self', targetType: 'user', targetId: userId, changes: input });
  return toAccountDto(user);
};

export const applyForReseller = async (ctx: Ctx, user: Actor, input: z.infer<typeof resellerApplicationSchema>) => {
  if (user.role !== UserRole.USER) throw Errors.badRequest('Only regular users can apply to become resellers');
  const pending = await ResellerApplication.exists({ userId: user._id, status: ApplicationStatus.PENDING });
  if (pending) throw Errors.conflict('You already have a pending application');
  const app = await ResellerApplication.create({ userId: user._id, ...definedOnly(input) });
  await audit(ctx, { action: 'reseller.apply', targetType: 'reseller_application', targetId: String(app._id), targetAncestors: user.ancestors });
  return app;
};

export const myResellerApplication = (userId: mongoose.Types.ObjectId) =>
  ResellerApplication.findOne({ userId }).sort({ createdAt: -1 }).lean();

// ─── Management ─────────────────────────────────────────────────────────────

export const listUsers = async (actor: Actor, query: z.infer<typeof listUsersQuerySchema>) => {
  const scope = visibleUsersFilter(actor);
  if (!scope) throw Errors.forbidden();
  const filter: Record<string, unknown> = { ...scope, authProvider: { $ne: AuthProvider.SYSTEM } };
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.parentId) filter.parentId = query.parentId;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { username: rx }];
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    User.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    User.countDocuments(filter),
  ]);
  return {
    items: items.map(toAccountDto),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
};

export const getUser = async (actor: Actor, id: string) => {
  const target = await loadTarget(id);
  if (!canViewUser(actor, target)) throw Errors.notFound('User');
  const [customerCount, parent] = await Promise.all([
    User.countDocuments({ parentId: target._id }),
    target.parentId ? User.findById(target.parentId).select('name username brandName role') : null,
  ]);
  return {
    ...toAccountDto(target),
    customerCount,
    parent: parent ? { id: String(parent._id), name: parent.brandName || parent.name, username: parent.username, role: parent.role } : null,
    canManage: canManageUser(actor, target),
  };
};

/**
 * Create an account under a reseller.
 *  - Resellers always create inside their own subtree (parent = themselves).
 *  - Staff may pick any reseller as parent, or null (platform-direct).
 *  - Creating a sub-reseller needs `resellers.create_sub`.
 */
export const createUser = async (ctx: Ctx, actor: Actor, input: z.infer<typeof createUserSchema>) => {
  if (!hasPermission(actor, Permission.USERS_CREATE)) throw Errors.forbidden();
  if (input.role === UserRole.RESELLER && !hasPermission(actor, Permission.RESELLERS_CREATE_SUB) && !hasPermission(actor, Permission.RESELLERS_PROMOTE)) {
    throw Errors.forbidden('You are not allowed to create resellers');
  }

  let parent: mongoose.HydratedDocument<IUser> | null = null;
  if (actor.role === UserRole.RESELLER) {
    parent = await User.findById(actor._id);
  } else if (input.parentId) {
    parent = await User.findById(input.parentId);
    if (!parent || (parent.role !== UserRole.RESELLER && parent.role !== UserRole.SUPER_ADMIN)) {
      throw Errors.badRequest('Parent must be a reseller');
    }
  }
  if (parent && parent.status !== UserStatus.ACTIVE) throw Errors.badRequest('Parent reseller is not active');

  const [emailTaken, usernameTaken] = await Promise.all([User.exists({ email: input.email }), User.exists({ username: input.username })]);
  if (emailTaken) throw Errors.conflict('Email already exists');
  if (usernameTaken) throw Errors.conflict('Username already taken');

  const user = await User.create({
    name: input.name,
    username: input.username,
    email: input.email,
    password: await bcrypt.hash(input.password, 12),
    role: input.role,
    status: UserStatus.ACTIVE,
    parentId: parent?._id ?? null,
    ancestors: parent ? [...(parent.ancestors ?? []), parent._id] : [],
    authProvider: AuthProvider.LOCAL,
  });

  await ensureBillingAccount(user);
  await grantInitialServices(user, actor, input.serviceKeys);
  await audit(ctx, {
    action: 'user.create', targetType: 'user', targetId: String(user._id), targetAncestors: user.ancestors,
    changes: { role: input.role, parentId: parent ? String(parent._id) : null, email: input.email },
  });
  return toAccountDto(user);
};

export const updateUser = async (ctx: Ctx, actor: Actor, id: string, input: z.infer<typeof updateUserSchema>) => {
  if (!hasPermission(actor, Permission.USERS_UPDATE)) throw Errors.forbidden();
  const target = await requireManageable(actor, id);
  if (input.permissions) {
    const invalid = input.permissions.filter((p) => !canGrantPermission(actor, p));
    if (invalid.length) throw Errors.forbidden(`You cannot grant: ${invalid.join(', ')}`);
  }
  if (input.brandName !== undefined && target.role !== UserRole.RESELLER) throw Errors.badRequest('Brand name applies to resellers only');
  const before = { name: target.name, phoneNumber: target.phoneNumber, brandName: target.brandName, permissions: target.permissions };
  Object.assign(target, definedOnly(input));
  await target.save();
  await audit(ctx, { action: 'user.update', targetType: 'user', targetId: id, targetAncestors: target.ancestors, changes: { before, after: input } });
  return toAccountDto(target);
};

export const setStatus = async (
  ctx: Ctx, actor: Actor, id: string, status: UserStatus, reason?: string,
) => {
  const needed = status === UserStatus.CLOSED ? Permission.USERS_CLOSE : Permission.USERS_SUSPEND;
  if (!hasPermission(actor, needed)) throw Errors.forbidden();
  const target = await requireManageable(actor, id);
  if (target.status === UserStatus.CLOSED) throw Errors.badRequest('Closed accounts cannot be changed');
  if (status === UserStatus.CLOSED && (await User.exists({ parentId: target._id, status: { $ne: UserStatus.CLOSED } }))) {
    throw Errors.badRequest('Reassign or close this reseller’s customers first');
  }
  const previous = target.status;
  target.status = status;
  if (status === UserStatus.ACTIVE) target.set('suspendedReason', undefined);
  else if (reason) target.suspendedReason = reason;
  await target.save();
  if (status !== UserStatus.ACTIVE) await revokeAllSessions(target._id);
  await audit(ctx, { action: `user.${status}`, targetType: 'user', targetId: id, targetAncestors: target.ancestors, changes: { from: previous, to: status, reason } });
  return toAccountDto(target);
};

/**
 * Change an account's role.
 *  - user ↔ reseller needs `resellers.promote`.
 *  - Making or removing an admin needs `staff.manage` (super admin only).
 *  - A reseller that still has customers cannot be demoted.
 */
export const changeRole = async (ctx: Ctx, actor: Actor, id: string, input: z.infer<typeof changeRoleSchema>) => {
  const target = await requireManageable(actor, id);
  const touchesStaff = input.role === UserRole.ADMIN || target.role === UserRole.ADMIN;
  if (touchesStaff ? !hasPermission(actor, Permission.STAFF_MANAGE) : !hasPermission(actor, Permission.RESELLERS_PROMOTE)) {
    throw Errors.forbidden();
  }
  if (target.role === input.role) return toAccountDto(target);
  if (target.role === UserRole.RESELLER && (await User.exists({ parentId: target._id }))) {
    throw Errors.badRequest('This reseller still has customers; move or close them first');
  }
  const from = target.role;
  target.role = input.role;
  if (input.role === UserRole.RESELLER) {
    target.resellerCode = input.resellerCode ?? target.resellerCode ?? `${target.username}`.replace(/_/g, '-');
  }
  if (input.role === UserRole.ADMIN) {
    // Staff are platform-level accounts, outside any reseller tree.
    target.parentId = null;
    target.ancestors = [];
  }
  await target.save();
  await revokeAllSessions(target._id); // new role takes effect on next login
  await audit(ctx, { action: 'user.change_role', targetType: 'user', targetId: id, targetAncestors: target.ancestors, changes: { from, to: input.role } });
  return toAccountDto(target);
};

export const listApplications = async (actor: Actor, status?: string) => {
  if (!hasPermission(actor, Permission.RESELLERS_PROMOTE)) throw Errors.forbidden();
  const filter: Record<string, unknown> = status ? { status } : {};
  return ResellerApplication.find(filter).sort({ createdAt: -1 }).limit(200).populate('userId', 'name email username status').lean();
};

export const decideApplication = async (
  ctx: Ctx, actor: Actor, id: string, input: z.infer<typeof decideApplicationSchema>,
) => {
  if (!hasPermission(actor, Permission.RESELLERS_PROMOTE)) throw Errors.forbidden();
  if (!mongoose.isValidObjectId(id)) throw Errors.notFound('Application');
  const app = await ResellerApplication.findOneAndUpdate(
    { _id: id, status: ApplicationStatus.PENDING },
    { $set: { status: input.decision, decidedBy: actor._id, decisionNote: input.note, decidedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!app) throw Errors.notFound('Pending application');
  if (input.decision === ApplicationStatus.APPROVED) {
    await changeRole(ctx, actor, String(app.userId), {
      role: UserRole.RESELLER,
      ...(input.resellerCode ? { resellerCode: input.resellerCode } : {}),
    });
  }
  await audit(ctx, { action: `reseller.application_${input.decision}`, targetType: 'reseller_application', targetId: id });
  return app;
};
