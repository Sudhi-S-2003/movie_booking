import mongoose from 'mongoose';
import { User } from '../../models/user.model.js';
import { UserRole } from '../../constants/enums.js';
import type { IUser } from '../../interfaces/models.interface.js';
import { Errors } from '../../core/http/errors.js';
import { getService } from '../catalog/entitlement.service.js';
import { PriceRule, type IPriceRule } from './billing.models.js';
import { ANY_SERVICE, MarkupType, PriceRuleScope } from './billing.constants.js';

/**
 * Pricing hierarchy (per unit, integer micros):
 *
 *   Platform base price                      B
 *   Top-level reseller price      P(r1)  =  B     + staff markup for r1
 *   Sub-reseller price            P(r2)  =  P(r1) + r1's markup for r2
 *   Customer price                P(u)   =  P(rk) + rk's markup for u
 *
 * Platform-direct customers are the super admin's customers, so their price
 * is B + the super admin's customer markup. The super admin pays B.
 *
 * On each charge the customer pays P(u) × units; every reseller in the chain
 * earns its own markup × units; the platform keeps P(r1) × units.
 */

type ChainUser = Pick<IUser, 'role' | 'parentId' | 'ancestors'> & { _id: mongoose.Types.ObjectId | unknown };

export interface PriceHopQuote {
  /** Who earns this hop's markup; null = platform. */
  resellerId: string | null;
  markupPerUnit: number;
}

export interface PriceQuote {
  serviceKey: string;
  basePrice: number;
  unitPrice: number;
  hops: PriceHopQuote[];
  /** Per-unit amount the platform keeps (base + platform-earned hops). */
  platformPerUnit: number;
}

let rootIdCache: { id: string | null; at: number } | null = null;
/** The super admin's id (cached briefly). */
export const getRootId = async (): Promise<string | null> => {
  if (rootIdCache && Date.now() - rootIdCache.at < 60_000) return rootIdCache.id;
  const root = await User.findOne({ role: UserRole.SUPER_ADMIN, isProtected: true }).select('_id').lean();
  rootIdCache = { id: root ? String(root._id) : null, at: Date.now() };
  return rootIdCache.id;
};

/** Apply a markup rule to a running price. */
export const applyMarkup = (price: number, rule: Pick<IPriceRule, 'type' | 'value'> | null): number => {
  if (!rule) return 0;
  return rule.type === MarkupType.PERCENT ? Math.round((price * rule.value) / 10_000) : rule.value;
};

/** Most specific rule wins: customer+service > customer+* > default+service > default+*. */
const pickRule = (rules: IPriceRule[], customerId: string | null, serviceKey: string): IPriceRule | null => {
  const matches = (c: string | null, s: string) =>
    rules.find((r) => String(r.customerId ?? null) === String(c) && r.serviceKey === s) ?? null;
  return (
    (customerId ? matches(customerId, serviceKey) ?? matches(customerId, ANY_SERVICE) : null) ??
    matches(null, serviceKey) ??
    matches(null, ANY_SERVICE)
  );
};

/**
 * Quote the per-unit price of `serviceKey` for `user`, walking the reseller
 * chain from the platform down to the user.
 */
export const quotePrice = async (user: ChainUser, serviceKey: string): Promise<PriceQuote> => {
  const service = await getService(serviceKey);
  if (!service) throw Errors.notFound('Service');
  const base = service.basePrice;
  const rootId = await getRootId();
  const userId = String(user._id);

  if (user.role === UserRole.SUPER_ADMIN) {
    return { serviceKey, basePrice: base, unitPrice: base, hops: [], platformPerUnit: base };
  }

  // Chain of accounts from the top of the tree down to the user, without the root.
  const ancestorIds = (user.ancestors ?? []).map(String).filter((id) => id !== rootId);
  const ancestors = ancestorIds.length
    ? await User.find({ _id: { $in: ancestorIds } }).select('_id role').lean()
    : [];
  const order = new Map(ancestorIds.map((id, i) => [id, i]));
  const resellers = ancestors
    .filter((a) => a.role === UserRole.RESELLER)
    .sort((a, b) => order.get(String(a._id))! - order.get(String(b._id))!)
    .map((a) => String(a._id));
  const chain = [...resellers, userId];

  // Load every rule that could apply in one query.
  const ruleFilters: Record<string, unknown>[] = [
    { scope: PriceRuleScope.RESELLER, resellerId: { $in: chain }, serviceKey: { $in: [serviceKey, ANY_SERVICE] } },
    { scope: PriceRuleScope.CUSTOMER, resellerId: { $in: [...resellers, ...(rootId ? [rootId] : [])] }, serviceKey: { $in: [serviceKey, ANY_SERVICE] } },
  ];
  const rules = await PriceRule.find({ $or: ruleFilters }).lean<IPriceRule[]>();

  let price = base;
  let platformPerUnit = base;
  const hops: PriceHopQuote[] = [];
  chain.forEach((childId, i) => {
    const parentId = i === 0 ? null : chain[i - 1]!;
    const childIsReseller = i < chain.length - 1 || user.role === UserRole.RESELLER;
    let rule: IPriceRule | null;
    if (parentId === null) {
      // Top of the tree: staff markup for a reseller, or the super admin's customer markup.
      rule = childIsReseller
        ? pickRule(rules.filter((r) => r.scope === PriceRuleScope.RESELLER && String(r.resellerId) === childId), null, serviceKey)
        : rootId
          ? pickRule(rules.filter((r) => r.scope === PriceRuleScope.CUSTOMER && String(r.resellerId) === rootId), childId, serviceKey)
          : null;
    } else {
      rule = pickRule(rules.filter((r) => r.scope === PriceRuleScope.CUSTOMER && String(r.resellerId) === parentId), childId, serviceKey);
    }
    const markup = applyMarkup(price, rule);
    price += markup;
    if (parentId === null) platformPerUnit += markup;
    hops.push({ resellerId: parentId, markupPerUnit: markup });
  });

  return { serviceKey, basePrice: base, unitPrice: price, hops, platformPerUnit };
};
