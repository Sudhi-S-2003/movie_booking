/** Platform roles — mirror of server `UserRole`. */
export type Role = 'super_admin' | 'admin' | 'reseller' | 'user';
export type AccountStatus = 'active' | 'suspended' | 'closed';

export interface Account {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: AccountStatus;
  parentId: string | null;
  isProtected: boolean;
  permissions: string[];
  effectivePermissions: string[];
  resellerCode: string | null;
  brandName: string | null;
  avatar: string | null;
  phoneNumber: string | null;
  twoFactorEnabled: boolean;
  suspendedReason: string | null;
  createdAt?: string;
  provider?: { id: string; name: string } | null;
}

export interface ManagedAccount extends Account {
  customerCount: number;
  parent: { id: string; name: string; username: string; role: Role } | null;
  canManage: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export type AccessReason =
  | 'unknown_service' | 'service_disabled' | 'account_inactive'
  | 'not_assigned' | 'provider_not_assigned' | 'not_enabled';

export interface ServiceEntry {
  key: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'beta' | 'disabled';
  unitLabel: string;
  allowed: boolean;
  enabled: boolean;
  usable: boolean;
  reason?: AccessReason;
  /** Caller's price per unit, in micros. */
  unitPrice?: number | null;
  config: Record<string, unknown>;
}

export interface CatalogService {
  key: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'beta' | 'disabled';
  selfServe: boolean;
  basePrice: number;
  unitLabel: string;
  sortOrder: number;
}

export type BillingMode = 'prepaid' | 'postpaid';

export interface BillingAccountSummary {
  mode: BillingMode;
  currency: string;
  balance: number;
  creditLimit: number | null;
  unbilled: number;
  outstanding: number;
  availableCredit: number | null;
  pendingEarnings: number;
  lifetimeEarnings: number;
  state: 'active' | 'frozen';
  isUnlimited: boolean;
  cycleDay: number;
  cycleStart: string;
}

export interface UsageByService { _id: string; units: number; total: number; count: number }

export interface ResellerEarnings {
  periodDays: number;
  earningsSettled: number;
  earningsPending: number;
  customersByStatus: Record<string, number>;
  customerRevenueByService: { _id: string; total: number; units: number }[];
}

export interface BillingSummary {
  account: BillingAccountSummary;
  usageByService: UsageByService[];
  earnings?: ResellerEarnings | null;
}

export interface LedgerEntry {
  _id: string;
  direction: 'credit' | 'debit';
  kind: string;
  amount: number;
  balanceAfter: number | null;
  description: string;
  createdAt: string;
}

export interface UsageRecord {
  _id: string;
  serviceKey: string;
  units: number;
  unitPrice: number;
  total: number;
  walletDebited: number;
  billingMode: BillingMode;
  status: 'settled' | 'unbilled' | 'invoiced';
  unlimited: boolean;
  description: string;
  createdAt: string;
}

export interface Invoice {
  _id: string;
  number: string;
  userId: { _id: string; name: string; username: string } | string;
  periodStart: string;
  periodEnd: string;
  lines: { serviceKey: string; units: number; amount: number; records: number }[];
  total: number;
  status: 'issued' | 'paid' | 'void';
  dueAt: string;
  paidAt?: string;
  paymentMethod?: 'wallet' | 'provider' | 'offline';
}

export type MarkupType = 'percent' | 'fixed';

export interface PriceRule {
  _id: string;
  scope: 'reseller' | 'customer';
  resellerId: string;
  customerId: string | null;
  serviceKey: string;
  type: MarkupType;
  value: number;
  updatedAt: string;
}

export interface PlatformOverview {
  periodDays: number;
  users: { total: number; resellers: number; admins: number; users: number };
  usage: { gross: number; platformRevenue: number; charges: number };
  revenueByService: { _id: string; gross: number; platform: number; units: number }[];
  outstandingInvoices: { total: number; count: number };
  walletsByMode: { _id: BillingMode; balance: number; unbilled: number; count: number }[];
  recentInvoices: Invoice[];
}

export interface AuditEntry {
  _id: string;
  actorId: { _id: string; name: string; username: string; role: Role } | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  changes?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface ResellerApplication {
  _id: string;
  userId: { _id: string; name: string; email: string; username: string; status: AccountStatus } | string;
  businessName: string;
  website?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionNote?: string;
  createdAt: string;
}
