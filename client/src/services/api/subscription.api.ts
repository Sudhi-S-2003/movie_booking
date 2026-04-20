import { http } from './http.js';

export type SubscriptionPlan = 'free' | 'pro' | 'proMax' | 'enterprise';
export type PaidPlan = 'pro' | 'proMax';
export type BillingCycle = 'monthly' | 'quarterly';
type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface SubscriptionInfo {
  plan:         SubscriptionPlan;
  billingCycle: BillingCycle | null;
  status:       SubscriptionStatus;
  startsAt:     string;
  expiresAt:    string | null;
  customMonthlyLimit?:   number | null;
  customDurationMonths?: number | null;
  /** How many paid subscriptions this user has purchased across all time. */
  purchasesCount?:       number;
}

/**
 * First-time / second-time promotional discount the user is currently
 * eligible for. 60 for first-ever purchase, 50 for the second, 0 after.
 * Surfaced on `GET /api/subscription` so cards can render the strike-through.
 */
interface PromoInfo {
  purchasesCount: number;
  discountPct:    number;
}

export interface TokenRemaining {
  plan:     SubscriptionPlan;
  daily?:   number;
  weekly?:  number;
  monthly?: number;
  /** ISO 8601 UTC timestamps of when each bucket next rolls over. */
  resetAt?: {
    daily?:   string;
    weekly?:  string;
    monthly?: string;
  };
}

interface SubscriptionSummaryResponse {
  subscription: SubscriptionInfo;
  remaining:    TokenRemaining;
  promo?:       PromoInfo;
}

export type OfferType = 'firstOrder' | 'secondOrder' | 'none';

interface PlanOffer {
  offerType:          OfferType;
  discountPct:        number;
  /** Present on paid cycles — omitted for Free and Enterprise. */
  finalPriceInPaise?: number;
  finalPriceDisplay?: number;
}

export interface PlanCatalogItem {
  plan:          SubscriptionPlan;
  cycle?:        BillingCycle;
  name:          string;
  description:   string;
  /** Base cycle price in rupees, BEFORE any promo discount. */
  priceDisplay:  number;
  priceInPaise?: number;
  currency:      string;
  durationDays?: number;
  savings?:      number;
  features:      readonly string[];
  limits:        { daily?: number; weekly?: number; monthly?: number };
  /** First-order / second-order promo applied on top of cycle price. */
  offer?:        PlanOffer;
  /**
   * The SINGLE number to render in the UI. Collapses base vs promo'd price
   * into one field — always post-promo for paid plans, 0 for free/enterprise.
   */
  displayPrice:        number;
  displayPriceInPaise: number;
  /**
   * Final price normalised to one month (rupees). Quarterly plans divide by 3.
   * Ready to render as "≈ ₹X/mo" without any client-side math.
   */
  perMonthDisplay:     number;
  perMonthInPaise:     number;
  /**
   * How many rupees the user saves versus this cycle's pre-promo base price.
   * 0 when no promo applies.
   */
  saveDisplay:         number;
  saveInPaise:         number;
}

export interface PlanCatalogViewer {
  authenticated:  boolean;
  purchasesCount: number | null;
  offerType:      OfferType;
  discountPct:    number;
}

export interface PlanCatalogResponse {
  plans: {
    free:             PlanCatalogItem;
    proMonthly:       PlanCatalogItem;
    proQuarterly:     PlanCatalogItem;
    proMaxMonthly:    PlanCatalogItem;
    proMaxQuarterly:  PlanCatalogItem;
    enterprise:       PlanCatalogItem;
  };
  viewer?: PlanCatalogViewer;
}

interface SubscriptionCheckoutResponse {
  paymentIntentId: string;
  clientSecret:    string;
  amount:          number;
  currency:        string;
  status:          string;
  plan:            PaidPlan;
  cycle:           BillingCycle;
  /** Promo discount applied on top of the cycle's base price. */
  promoPct?:       number;
  /** Original pre-promo amount in paise — lets the UI render strike-through. */
  originalPrice?:  number;
}

interface EnterpriseCheckoutResponse {
  paymentIntentId: string;
  clientSecret:    string;
  amount:          number;
  currency:        string;
  status:          string;
  plan:            'enterprise';
  customMonthlyLimit:   number;
  customDurationMonths: number;
  /** Final price in rupees (display). */
  priceDisplay:   number;
  /** 0, 5, 10, or 15 depending on duration tier. */
  discountPct:    number;
}

interface EnterpriseQuoteResponse {
  monthlyLimit:   number;
  durationMonths: number;
  priceInPaise:   number;
  priceDisplay:   number;
  discountPct:    number;
  currency:       string;
}

export const subscriptionApi = {
  getSubscription: () => http.get<SubscriptionSummaryResponse>('/subscription'),
  /**
   * Signature-authenticated subscription fetch for guest chat pages. Returns
   * the API-key owner's subscription summary (whose pool is charged for
   * every guest send) so the header pill can show the right balance.
   */
  getGuestSubscription: (
    conversationId: string,
    params: { signature: string; expiresAt: string },
  ) =>
    http.get<SubscriptionSummaryResponse>(
      `/public/chat/conversation/${conversationId}/subscription`,
      { params: params as Record<string, string> },
    ),
  getPlans:        () => http.get<PlanCatalogResponse>('/subscription/plans'),
  checkout:        (plan: PaidPlan, cycle: BillingCycle) =>
    http.post<SubscriptionCheckoutResponse>('/subscription/checkout', { plan, cycle }),
  enterpriseCheckout: (args: { monthlyLimit: number; durationMonths: number }) =>
    http.post<EnterpriseCheckoutResponse>('/subscription/enterprise/checkout', args),
  enterpriseQuote: (monthlyLimit: number, durationMonths: number) =>
    http.get<EnterpriseQuoteResponse>('/subscription/enterprise/quote', {
      params: { monthlyLimit, durationMonths },
    }),
  confirm:         (paymentIntentId: string) =>
    http.post<SubscriptionSummaryResponse>('/subscription/confirm', { paymentIntentId }),
  cancel:          () => http.post<SubscriptionSummaryResponse>('/subscription/cancel', {}),
};
