import type { Request, Response } from 'express';
import { asyncHandler, parse, ok, actorOf } from '../../core/http/handler.js';
import { Errors } from '../../core/http/errors.js';
import { UserStatus } from '../../constants/enums.js';
import { hasPermission } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';
import { AuditLog } from '../audit/audit.model.js';
import { visibleAuditFilter } from '../audit/audit.service.js';
import * as Accounts from './accounts.service.js';
import {
  updateMeSchema, resellerApplicationSchema, listUsersQuerySchema, createUserSchema, updateUserSchema,
  suspendSchema, changeRoleSchema, decideApplicationSchema, auditQuerySchema,
} from './accounts.schemas.js';

const idParam = (req: Request) => String(req.params.id);

// Self-service
export const getMe = asyncHandler(async (req, res) => { ok(res, await Accounts.getMe(String(actorOf(req)._id))); });
export const updateMe = asyncHandler(async (req, res) => {
  ok(res, await Accounts.updateMe(req, String(actorOf(req)._id), parse(updateMeSchema, req.body)));
});
export const applyReseller = asyncHandler(async (req, res) => {
  ok(res, await Accounts.applyForReseller(req, actorOf(req), parse(resellerApplicationSchema, req.body)), 201);
});
export const getMyApplication = asyncHandler(async (req, res) => { ok(res, await Accounts.myResellerApplication(actorOf(req)._id)); });

// Management
export const listUsers = asyncHandler(async (req, res) => { ok(res, await Accounts.listUsers(actorOf(req), parse(listUsersQuerySchema, req.query))); });
export const getUser = asyncHandler(async (req, res) => { ok(res, await Accounts.getUser(actorOf(req), idParam(req))); });
export const createUser = asyncHandler(async (req, res) => {
  ok(res, await Accounts.createUser(req, actorOf(req), parse(createUserSchema, req.body)), 201);
});
export const updateUser = asyncHandler(async (req, res) => {
  ok(res, await Accounts.updateUser(req, actorOf(req), idParam(req), parse(updateUserSchema, req.body)));
});
export const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = parse(suspendSchema, req.body);
  ok(res, await Accounts.setStatus(req, actorOf(req), idParam(req), UserStatus.SUSPENDED, reason));
});
export const reactivateUser = asyncHandler(async (req, res) => {
  ok(res, await Accounts.setStatus(req, actorOf(req), idParam(req), UserStatus.ACTIVE));
});
export const closeUser = asyncHandler(async (req, res) => {
  const { reason } = parse(suspendSchema, req.body);
  ok(res, await Accounts.setStatus(req, actorOf(req), idParam(req), UserStatus.CLOSED, reason));
});
export const changeRole = asyncHandler(async (req, res) => {
  ok(res, await Accounts.changeRole(req, actorOf(req), idParam(req), parse(changeRoleSchema, req.body)));
});
export const listApplications = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  ok(res, await Accounts.listApplications(actorOf(req), status));
});
export const decideApplication = asyncHandler(async (req, res) => {
  ok(res, await Accounts.decideApplication(req, actorOf(req), idParam(req), parse(decideApplicationSchema, req.body)));
});

export const listAudit = asyncHandler(async (req: Request, res: Response) => {
  const actor = actorOf(req);
  if (!hasPermission(actor, Permission.AUDIT_READ) && actor.role !== 'reseller') throw Errors.forbidden();
  const q = parse(auditQuerySchema, req.query);
  const filter: Record<string, unknown> = { ...visibleAuditFilter(actor) };
  if (q.action) filter.action = q.action;
  if (q.targetId) filter.targetId = q.targetId;
  if (q.actorId) filter.actorId = q.actorId;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('actorId', 'name username role').lean(),
    AuditLog.countDocuments(filter),
  ]);
  ok(res, { items, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) } });
});
