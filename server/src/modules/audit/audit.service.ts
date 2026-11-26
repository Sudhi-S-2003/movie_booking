import type { Request } from 'express';
import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { AuditLog } from './audit.model.js';
import { definedOnly } from '../../utils/object.util.js';
import { getClientIp } from '../../utils/ip.util.js';
import { UserRole } from '../../constants/enums.js';
import type { AccessSubject } from '../access/access.service.js';

export interface AuditEntry {
  action: string;
  targetType: string;
  targetId?: string | undefined;
  targetAncestors?: unknown[] | undefined;
  changes?: Record<string, unknown> | undefined;
}

/**
 * Record an audit entry. Pass a session to make the entry part of the same
 * transaction as the change it describes (financial operations do this).
 */
export const audit = async (
  req: Pick<Request, 'user' | 'ip' | 'socket' | 'headers'> | null,
  entry: AuditEntry,
  session?: ClientSession | null,
): Promise<void> => {
  const doc = definedOnly({
    actorId: req?.user?._id ?? null,
    actorRole: req?.user?.role ?? 'system',
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetAncestors: (entry.targetAncestors ?? []).map((a) => new mongoose.Types.ObjectId(String(a))),
    changes: entry.changes,
    ip: req ? getClientIp(req) : undefined,
    userAgent: req ? String(req.headers["user-agent"] ?? "") : undefined,
  });
  await AuditLog.create([doc], session ? { session } : {});
};

/** Filter limiting audit entries to what `actor` may read. */
export const visibleAuditFilter = (actor: AccessSubject): Record<string, unknown> => {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return {};
  // Resellers see actions on their subtree and their own actions.
  return { $or: [{ targetAncestors: actor._id }, { actorId: actor._id }] };
};
