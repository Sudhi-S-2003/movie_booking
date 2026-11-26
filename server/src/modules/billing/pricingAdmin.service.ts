import mongoose from 'mongoose';
import type { Request } from 'express';
import { User } from '../../models/user.model.js';
import { UserRole } from '../../constants/enums.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { Errors } from '../../core/http/errors.js';
import { canManageUser, hasPermission, type AccessSubject } from '../access/access.service.js';
import { Permission } from '../access/access.constants.js';
import { audit } from '../audit/audit.service.js';
import { Service, type IService } from '../catalog/catalog.models.js';
import { invalidateCatalogCache, getService } from '../catalog/entitlement.service.js';
import { PriceRule } from './billing.models.js';
import { ANY_SERVICE, MarkupType, PriceRuleScope } from './billing.constants.js';

type Actor = AccessSubject & Pick<IUser, 'name'>;
type Ctx = Pick<Request, 'user' | 'ip' | 'socket' | 'headers'>;

/** Hard ceilings so a typo can't price a service at 10,000%. */
const MAX_PERCENT_BPS = 100_000; // 1000%

export interface MarkupInput {
  serviceKey: string;
  type: MarkupType;
  value: number;
}

const validateMarkup = async (input: MarkupInput) => {
  if (input.serviceKey !== ANY_SERVICE && !(await getService(input.serviceKey))) throw Errors.notFound('Service');
  if (input.type === MarkupType.PERCENT && input.value > MAX_PERCENT_BPS) throw Errors.badRequest('Markup cannot exceed 1000%');
};

/** Staff: base price and catalog attributes of a service. */
export const updateService = async (
  ctx: Ctx, actor: Actor, key: string,
  input: Partial<Pick<IService, 'name' | 'description' | 'status' | 'selfServe' | 'basePrice' | 'sortOrder'>>,
) => {
  if (!hasPermission(actor, Permission.SERVICES_MANAGE)) throw Errors.forbidden();
  if (input.basePrice !== undefined && !hasPermission(actor, Permission.PRICING_MANAGE)) throw Errors.forbidden('Changing base prices requires pricing permission');
  const before = await Service.findOne({ key }).lean();
  if (!before) throw Errors.notFound('Service');
  const updated = await Service.findOneAndUpdate({ key }, { $set: input }, { returnDocument: 'after', runValidators: true }).lean();
  invalidateCatalogCache();
  await audit(ctx, { action: 'service.update', targetType: 'service', targetId: key, changes: { before: { status: before.status, basePrice: before.basePrice, selfServe: before.selfServe }, after: input } });
  return updated;
};

/** Staff: the markup a reseller pays on top of the base price. */
export const setResellerMarkup = async (ctx: Ctx, actor: Actor, resellerId: string, input: MarkupInput) => {
  if (!hasPermission(actor, Permission.PRICING_RESELLER_MARKUP)) throw Errors.forbidden();
  if (!mongoose.isValidObjectId(resellerId)) throw Errors.notFound('Reseller');
  const reseller = await User.findById(resellerId);
  if (!reseller || reseller.role !== UserRole.RESELLER) throw Errors.notFound('Reseller');
  await validateMarkup(input);
  const rule = await PriceRule.findOneAndUpdate(
    { scope: PriceRuleScope.RESELLER, resellerId: reseller._id, customerId: null, serviceKey: input.serviceKey },
    { $set: { type: input.type, value: input.value, setBy: actor._id } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  await audit(ctx, { action: 'pricing.reseller_markup', targetType: 'user', targetId: resellerId, targetAncestors: reseller.ancestors, changes: { ...input } });
  return rule;
};

/**
 * Reseller (or the super admin, as a reseller of platform-direct customers):
 * markup charged to its customers. `customerId` null = default for all its
 * direct customers.
 */
export const setCustomerMarkup = async (ctx: Ctx, actor: Actor, customerId: string | null, input: MarkupInput) => {
  if (actor.role !== UserRole.RESELLER && actor.role !== UserRole.SUPER_ADMIN) throw Errors.forbidden('Only resellers set customer markups');
  if (!hasPermission(actor, Permission.PRICING_SET_CUSTOMER_MARKUP)) throw Errors.forbidden();
  let customer: mongoose.HydratedDocument<IUser> | null = null;
  if (customerId) {
    if (!mongoose.isValidObjectId(customerId)) throw Errors.notFound('Customer');
    customer = await User.findById(customerId);
    const direct = customer && (String(customer.parentId) === String(actor._id) || (actor.role === UserRole.SUPER_ADMIN && !customer.parentId));
    if (!customer || !direct || !canManageUser(actor, customer)) throw Errors.notFound('Customer');
  }
  await validateMarkup(input);
  const rule = await PriceRule.findOneAndUpdate(
    { scope: PriceRuleScope.CUSTOMER, resellerId: actor._id, customerId: customer?._id ?? null, serviceKey: input.serviceKey },
    { $set: { type: input.type, value: input.value, setBy: actor._id } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  await audit(ctx, { action: 'pricing.customer_markup', targetType: 'user', targetId: customerId ?? 'default', changes: { ...input } });
  return rule;
};

export const deleteRule = async (ctx: Ctx, actor: Actor, ruleId: string) => {
  if (!mongoose.isValidObjectId(ruleId)) throw Errors.notFound('Price rule');
  const rule = await PriceRule.findById(ruleId);
  if (!rule) throw Errors.notFound('Price rule');
  const allowed = rule.scope === PriceRuleScope.RESELLER
    ? hasPermission(actor, Permission.PRICING_RESELLER_MARKUP)
    : String(rule.resellerId) === String(actor._id);
  if (!allowed) throw Errors.notFound('Price rule');
  await PriceRule.deleteOne({ _id: rule._id });
  await audit(ctx, { action: 'pricing.rule_deleted', targetType: 'price_rule', targetId: ruleId, changes: { scope: rule.scope, serviceKey: rule.serviceKey } });
};

/** Rules visible to the actor: staff see reseller rules; resellers see their own customer rules and the markup they pay. */
export const listRules = async (actor: Actor, resellerId?: string) => {
  if (actor.role === UserRole.RESELLER) {
    return PriceRule.find({ $or: [{ scope: PriceRuleScope.CUSTOMER, resellerId: actor._id }, { scope: PriceRuleScope.RESELLER, resellerId: actor._id }] }).lean();
  }
  if (!hasPermission(actor, Permission.PRICING_RESELLER_MARKUP) && actor.role !== UserRole.SUPER_ADMIN) throw Errors.forbidden();
  const filter: Record<string, unknown> = {};
  if (resellerId && mongoose.isValidObjectId(resellerId)) filter.resellerId = resellerId;
  return PriceRule.find(filter).sort({ updatedAt: -1 }).limit(500).lean();
};
