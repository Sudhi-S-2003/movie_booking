/**
 * Money is stored as integer micro-units of the platform currency
 * (1 INR = 1_000_000 micros). Integers avoid float rounding drift in the
 * ledger, and micros allow sub-paisa per-unit prices (e.g. per-token).
 */
export const MICROS_PER_UNIT = 1_000_000;
export const PLATFORM_CURRENCY = 'INR';

export const BillingMode = { PREPAID: 'prepaid', POSTPAID: 'postpaid' } as const;
export type BillingMode = (typeof BillingMode)[keyof typeof BillingMode];

export const AccountState = { ACTIVE: 'active', FROZEN: 'frozen' } as const;
export type AccountState = (typeof AccountState)[keyof typeof AccountState];

/** Why a ledger entry exists. Every balance change has exactly one entry. */
export const LedgerKind = {
  USAGE_DEBIT: 'usage_debit',         // prepaid service charge
  MARKUP_CREDIT: 'markup_credit',     // reseller earning from a customer's charge
  TOPUP: 'topup',                     // funds added by the platform (payment received)
  TRANSFER_OUT: 'transfer_out',       // reseller sends credit to a customer
  TRANSFER_IN: 'transfer_in',
  ADJUSTMENT: 'adjustment',           // super-admin correction (signed by direction)
  INVOICE_PAYMENT: 'invoice_payment', // postpaid invoice paid from wallet
  PROVIDER_SETTLEMENT: 'provider_settlement', // reseller pays upstream share of a customer invoice it collected
} as const;
export type LedgerKind = (typeof LedgerKind)[keyof typeof LedgerKind];

/** Lifecycle of a usage charge. */
export const UsageStatus = {
  SETTLED: 'settled',   // paid (prepaid debit, or postpaid invoice paid) and earnings credited
  UNBILLED: 'unbilled', // postpaid, accumulating in the current cycle
  INVOICED: 'invoiced', // postpaid, on an issued invoice awaiting payment
} as const;
export type UsageStatus = (typeof UsageStatus)[keyof typeof UsageStatus];

export const InvoiceStatus = { ISSUED: 'issued', PAID: 'paid', VOID: 'void' } as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const InvoicePaymentMethod = {
  WALLET: 'wallet',     // customer's own wallet balance
  PROVIDER: 'provider', // the customer's reseller collected it and pays the upstream share
  OFFLINE: 'offline',   // platform received payment outside the system
} as const;
export type InvoicePaymentMethod = (typeof InvoicePaymentMethod)[keyof typeof InvoicePaymentMethod];

export const MarkupType = { PERCENT: 'percent', FIXED: 'fixed' } as const;
export type MarkupType = (typeof MarkupType)[keyof typeof MarkupType];

/** Who defined a price rule. */
export const PriceRuleScope = {
  /** Staff-defined markup a reseller pays on top of the base price. */
  RESELLER: 'reseller',
  /** A reseller's markup for its customers (specific customer or default). */
  CUSTOMER: 'customer',
} as const;
export type PriceRuleScope = (typeof PriceRuleScope)[keyof typeof PriceRuleScope];

export const ANY_SERVICE = '*';
export const INVOICE_DUE_DAYS = 15;
