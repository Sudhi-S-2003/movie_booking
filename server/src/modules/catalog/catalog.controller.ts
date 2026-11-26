import mongoose from 'mongoose';
import { asyncHandler, parse, ok, actorOf } from '../../core/http/handler.js';
import { definedOnly } from '../../utils/object.util.js';
import { Errors } from '../../core/http/errors.js';
import { User } from '../../models/user.model.js';
import { canViewUser } from '../access/access.service.js';
import { audit } from '../audit/audit.service.js';
import { listServicesFor, setEnabled, setConfig, assignService, getCatalog } from './entitlement.service.js';
import { updateService } from '../billing/pricingAdmin.service.js';
import { quotePrice } from '../billing/pricing.service.js';
import { toggleServiceSchema, serviceConfigSchema, assignServiceSchema, updateServiceSchema } from '../billing/billing.schemas.js';

/** GET /api/services — catalog with the caller's access state and price. */
export const listMyServices = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const services = await listServicesFor(actor);
  const prices = await Promise.all(services.map((s) => quotePrice(actor, s.key).then((q) => q.unitPrice).catch(() => null)));
  ok(res, services.map((s, i) => ({ ...s, unitPrice: prices[i] })));
});

export const toggleMyService = asyncHandler(async (req, res) => {
  const { enabled } = parse(toggleServiceSchema, req.body);
  const key = String(req.params.key);
  const decision = await setEnabled(actorOf(req), key, enabled);
  await audit(req, { action: enabled ? 'service.enable' : 'service.disable', targetType: 'service', targetId: key });
  ok(res, decision);
});

export const configureMyService = asyncHandler(async (req, res) => {
  const { config } = parse(serviceConfigSchema, req.body);
  await setConfig(actorOf(req), String(req.params.key), config);
  ok(res, { saved: true });
});

/** GET /api/services/users/:id — a managed account's services (for managers). */
export const listUserServices = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw Errors.notFound('User');
  const target = await User.findById(id);
  if (!target || !canViewUser(actor, target)) throw Errors.notFound('User');
  ok(res, await listServicesFor(target));
});

export const assignUserService = asyncHandler(async (req, res) => {
  const actor = actorOf(req);
  const { allowed } = parse(assignServiceSchema, req.body);
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw Errors.notFound('User');
  const target = await User.findById(id);
  if (!target) throw Errors.notFound('User');
  const key = String(req.params.key);
  await assignService(actor, target, key, allowed);
  await audit(req, { action: allowed ? 'service.assign' : 'service.revoke', targetType: 'user', targetId: id, targetAncestors: target.ancestors, changes: { service: key } });
  ok(res, { serviceKey: key, allowed });
});

/** Staff catalog management. */
export const listCatalog = asyncHandler(async (_req, res) => { ok(res, [...(await getCatalog()).values()]); });
export const patchService = asyncHandler(async (req, res) => {
  ok(res, await updateService(req, actorOf(req), String(req.params.key), definedOnly(parse(updateServiceSchema, req.body))));
});

/**
 * GET /api/services/public — public price list (no auth). Shows active and
 * beta services at the platform base price; resellers set their own prices
 * for their customers, which signed-in users see on their Services page.
 */
export const publicCatalog = asyncHandler(async (_req, res) => {
  const services = [...(await getCatalog()).values()]
    .filter((s) => s.status !== 'disabled')
    .map((s) => ({ key: s.key, name: s.name, description: s.description, category: s.category, status: s.status, unitLabel: s.unitLabel, basePrice: s.basePrice, selfServe: s.selfServe }));
  res.setHeader('Cache-Control', 'public, max-age=60');
  ok(res, services);
});
