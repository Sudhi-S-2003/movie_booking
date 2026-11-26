import mongoose from 'mongoose';
import { Service, Entitlement, ServiceStatus, type IService } from './catalog.models.js';
import { SERVICE_REGISTRY } from './catalog.registry.js';
import { UserRole, UserStatus } from '../../constants/enums.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { Errors } from '../../core/http/errors.js';
import { canManageUser, hasPermission, type AccessSubject } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';

type Account = AccessSubject & Pick<IUser, 'parentId'>;

// ─── Catalog cache ──────────────────────────────────────────────────────────
// Catalog records change rarely; a short TTL avoids a DB hit on every
// metered request while keeping admin edits visible within seconds.
const CACHE_TTL_MS = 10_000;
let cache: { at: number; byKey: Map<string, IService> } | null = null;

export const invalidateCatalogCache = () => { cache = null; };

export const getCatalog = async (): Promise<Map<string, IService>> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.byKey;
  const docs = await Service.find().sort({ sortOrder: 1 }).lean();
  cache = { at: Date.now(), byKey: new Map(docs.map((d) => [d.key, d as IService])) };
  return cache.byKey;
};

export const getService = async (key: string): Promise<IService | undefined> => (await getCatalog()).get(key);

/** Insert registry services missing from the DB. Never overwrites admin edits. */
export const syncCatalog = async (): Promise<void> => {
  await Promise.all(
    SERVICE_REGISTRY.map((def) =>
      Service.updateOne(
        { key: def.key },
        {
          $setOnInsert: {
            key: def.key, name: def.name, description: def.description, category: def.category,
            status: ServiceStatus.ACTIVE, selfServe: def.selfServe, basePrice: Math.round(def.defaultBasePrice),
            unitLabel: def.unitLabel, sortOrder: def.sortOrder,
          },
        },
        { upsert: true },
      ),
    ),
  );
  invalidateCatalogCache();
};

/** Is the account platform-direct (no reseller above it other than the root)? */
const isPlatformDirect = async (account: Account): Promise<boolean> => {
  if (!account.parentId) return true;
  const parent = await mongoose.model('User').findById(account.parentId).select('role').lean<{ role: string }>();
  return parent?.role === UserRole.SUPER_ADMIN;
};

export interface AccessDecision {
  allowed: boolean;
  enabled: boolean;
  usable: boolean;
  reason?: 'unknown_service' | 'service_disabled' | 'account_inactive' | 'not_assigned' | 'provider_not_assigned' | 'not_enabled';
}

/**
 * Decide whether `account` may use `serviceKey`. Rules:
 *  1. Super admin: every known service, always (including disabled ones,
 *     so the owner can test before launch).
 *  2. The service must be active/beta and the account active.
 *  3. Every reseller above the account (excluding the root owner) must be
 *     allowed the service — revoking it from a reseller cuts off its
 *     whole subtree immediately.
 *  4. The account itself must be allowed (explicit row, or implied for
 *     platform-direct users of self-serve services) and have it enabled.
 */
export const resolveAccess = async (account: Account, serviceKey: string): Promise<AccessDecision> => {
  const service = await getService(serviceKey);
  if (!service) return { allowed: false, enabled: false, usable: false, reason: 'unknown_service' };
  if (account.role === UserRole.SUPER_ADMIN) return { allowed: true, enabled: true, usable: true };
  if (service.status === ServiceStatus.DISABLED) return { allowed: false, enabled: false, usable: false, reason: 'service_disabled' };
  if (account.status !== UserStatus.ACTIVE) return { allowed: false, enabled: false, usable: false, reason: 'account_inactive' };

  const chainIds = (account.ancestors ?? []).map(String);
  const rows = await Entitlement.find({ serviceKey, userId: { $in: [...chainIds, String(account._id)] } }).lean();
  const byUser = new Map(rows.map((r) => [String(r.userId), r]));

  const chain = chainIds.length
    ? await mongoose.model('User').find({ _id: { $in: chainIds } }).select('role status').lean<{ _id: unknown; role: string; status: string }[]>()
    : [];
  const rootIds = new Set(chain.filter((u) => u.role === UserRole.SUPER_ADMIN).map((u) => String(u._id)));
  // Platform-direct = no parent, or the parent is the root owner.
  const directUnderRoot = (parentId: unknown) => !parentId || rootIds.has(String(parentId));

  /**
   * Is an account allowed the service? An explicit row decides; without one,
   * platform-direct accounts get self-serve services implicitly. The same
   * rule applies to every reseller in the chain and to the account itself.
   */
  const allowedFor = (userId: string, parentId: unknown): boolean => {
    const row = byUser.get(userId);
    return row ? row.allowed : service.selfServe && directUnderRoot(parentId);
  };

  // ancestors are root-first, so each reseller's parent is the previous id.
  for (let i = 0; i < chainIds.length; i++) {
    const r = chain.find((u) => String(u._id) === chainIds[i]);
    if (!r || r.role === UserRole.SUPER_ADMIN) continue;
    if (r.status !== UserStatus.ACTIVE || !allowedFor(chainIds[i]!, i === 0 ? null : chainIds[i - 1])) {
      return { allowed: false, enabled: false, usable: false, reason: 'provider_not_assigned' };
    }
  }

  const own = byUser.get(String(account._id));
  const allowed = own
    ? own.allowed
    : service.selfServe && (rootIds.size || !account.parentId ? directUnderRoot(account.parentId) : await isPlatformDirect(account));
  // No row yet: implied self-serve access starts switched on, so existing
  // platform-direct users keep working; they can switch services off.
  const enabled = own ? own.enabled : allowed;
  if (!allowed) return { allowed, enabled, usable: false, reason: 'not_assigned' };
  if (!enabled) return { allowed, enabled, usable: false, reason: 'not_enabled' };
  return { allowed, enabled, usable: true };
};

/** Throw 403 unless the account can use the service right now. */
export const assertServiceAccess = async (account: Account, serviceKey: string) => {
  const decision = await resolveAccess(account, serviceKey);
  if (!decision.usable) {
    const messages: Record<string, string> = {
      unknown_service: 'Unknown service',
      service_disabled: 'This service is currently unavailable',
      account_inactive: 'Your account is not active',
      not_assigned: 'This service is not available on your plan. Contact your provider.',
      provider_not_assigned: 'This service is not available from your provider',
      not_enabled: 'Enable this service in your Services page to use it',
    };
    throw Errors.serviceUnavailable(messages[decision.reason ?? 'not_assigned'] ?? 'Service unavailable');
  }
};

/** Catalog view for an account: every service with its access state and price. */
export const listServicesFor = async (account: Account) => {
  const catalog = [...(await getCatalog()).values()].filter((s) => s.status !== ServiceStatus.DISABLED || account.role === UserRole.SUPER_ADMIN);
  const decisions = await Promise.all(catalog.map((s) => resolveAccess(account, s.key)));
  const rows = await Entitlement.find({ userId: account._id }).lean();
  const configByKey = new Map(rows.map((r) => [r.serviceKey, r.config]));
  return catalog.map((s, i) => ({
    key: s.key, name: s.name, description: s.description, category: s.category, status: s.status,
    unitLabel: s.unitLabel, ...decisions[i]!, config: configByKey.get(s.key) ?? {},
  }));
};

/** Owner toggles a service on/off for themselves. */
export const setEnabled = async (account: Account, serviceKey: string, enabled: boolean) => {
  const decision = await resolveAccess(account, serviceKey);
  if (decision.reason === 'unknown_service') throw Errors.notFound('Service');
  if (enabled && !decision.allowed && account.role !== UserRole.SUPER_ADMIN) {
    throw Errors.forbidden('This service has not been made available to your account');
  }
  await Entitlement.updateOne(
    { userId: account._id, serviceKey },
    { $set: { enabled }, $setOnInsert: { allowed: decision.allowed, config: {} } },
    { upsert: true },
  );
  return resolveAccess(account, serviceKey);
};

const MAX_CONFIG_BYTES = 16 * 1024;
export const setConfig = async (account: Account, serviceKey: string, config: Record<string, unknown>) => {
  const decision = await resolveAccess(account, serviceKey);
  if (!decision.allowed) throw Errors.forbidden('Service not available');
  if (Buffer.byteLength(JSON.stringify(config)) > MAX_CONFIG_BYTES) throw Errors.badRequest('Configuration is too large');
  await Entitlement.updateOne({ userId: account._id, serviceKey }, { $set: { config } }, { upsert: true });
};

/**
 * A manager (staff or reseller) allows/revokes a service for an account it
 * manages. Resellers can only pass on services they can use themselves.
 */
export const assignService = async (manager: Account, target: Account, serviceKey: string, allowed: boolean) => {
  if (!hasPermission(manager, Permission.SERVICES_ASSIGN)) throw Errors.forbidden();
  if (!canManageUser(manager, target)) throw Errors.notFound('User');
  if (!(await getService(serviceKey))) throw Errors.notFound('Service');
  if (allowed && manager.role === UserRole.RESELLER && !(await resolveAccess(manager, serviceKey)).allowed) {
    throw Errors.forbidden('You can only assign services that are available to you');
  }
  await Entitlement.updateOne(
    { userId: target._id, serviceKey },
    { $set: { allowed, grantedBy: manager._id, ...(allowed ? {} : { enabled: false }) }, $setOnInsert: { config: {} } },
    { upsert: true },
  );
};

/**
 * Initial services for a newly created account: the listed keys, or for a
 * reseller-created account every service the reseller itself can use.
 * New accounts start with assigned services enabled so they work at once.
 */
export const grantInitialServices = async (user: Account, creator: Account, serviceKeys?: string[]) => {
  const catalog = await getCatalog();
  let keys = serviceKeys?.filter((k) => catalog.has(k));
  if (!keys) {
    if (creator.role !== UserRole.RESELLER) return; // staff-created: self-serve defaults apply
    const decisions = await Promise.all([...catalog.keys()].map(async (k) => [k, await resolveAccess(creator, k)] as const));
    keys = decisions.filter(([, d]) => d.allowed).map(([k]) => k);
  }
  if (creator.role === UserRole.RESELLER) {
    const usable = await Promise.all(keys.map(async (k) => ((await resolveAccess(creator, k)).allowed ? k : null)));
    keys = usable.filter((k): k is string => k !== null);
  }
  if (!keys.length) return;
  await Entitlement.bulkWrite(
    keys.map((serviceKey) => ({
      updateOne: {
        filter: { userId: user._id, serviceKey },
        update: { $set: { allowed: true, enabled: true, grantedBy: creator._id }, $setOnInsert: { config: {} } },
        upsert: true,
      },
    })),
  );
};
