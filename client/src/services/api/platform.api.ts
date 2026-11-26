import { http } from './http.js';
import type {
  Account, ManagedAccount, Paginated, ServiceEntry, CatalogService, BillingSummary, LedgerEntry,
  UsageRecord, Invoice, PriceRule, PlatformOverview, AuditEntry, ResellerApplication, BillingMode,
  MarkupType, Role, BillingAccountSummary, ResellerEarnings,
} from '../../types/platform.js';

/** Endpoints return `{ success, data }`; `http` strips `success`. */
type Data<T> = { data: T };
const unwrap = async <T>(p: Promise<Data<T>>): Promise<T> => (await p).data;

export const accountApi = {
  me: () => unwrap(http.get<Data<Account>>('/account/me')),
  updateMe: (body: Partial<Pick<Account, 'name' | 'phoneNumber' | 'avatar' | 'brandName'>>) =>
    unwrap(http.patch<Data<Account>>('/account/me', body)),
  myApplication: () => unwrap(http.get<Data<ResellerApplication | null>>('/account/reseller-application')),
  applyReseller: (body: { businessName: string; website?: string; note?: string }) =>
    unwrap(http.post<Data<ResellerApplication>>('/account/reseller-application', body)),
};

export interface ListUsersParams { q?: string; role?: Role; status?: string; parentId?: string; page?: number; limit?: number }
export interface CreateUserBody {
  name: string; username: string; email: string; password: string;
  role?: 'user' | 'reseller'; parentId?: string | null; serviceKeys?: string[];
}

export const manageApi = {
  listUsers: (params: ListUsersParams = {}) =>
    unwrap(http.get<Data<Paginated<Account>>>('/manage/users', { params: params as Record<string, unknown> })),
  getUser: (id: string) => unwrap(http.get<Data<ManagedAccount>>(`/manage/users/${id}`)),
  createUser: (body: CreateUserBody) => unwrap(http.post<Data<Account>>('/manage/users', body)),
  updateUser: (id: string, body: Partial<{ name: string; phoneNumber: string; brandName: string; permissions: string[] }>) =>
    unwrap(http.patch<Data<Account>>(`/manage/users/${id}`, body)),
  suspend: (id: string, reason: string) => unwrap(http.post<Data<Account>>(`/manage/users/${id}/suspend`, { reason })),
  reactivate: (id: string) => unwrap(http.post<Data<Account>>(`/manage/users/${id}/reactivate`, {})),
  close: (id: string, reason: string) => unwrap(http.post<Data<Account>>(`/manage/users/${id}/close`, { reason })),
  changeRole: (id: string, role: 'user' | 'reseller' | 'admin', resellerCode?: string) =>
    unwrap(http.post<Data<Account>>(`/manage/users/${id}/role`, { role, ...(resellerCode ? { resellerCode } : {}) })),
  applications: (status?: string) =>
    unwrap(http.get<Data<ResellerApplication[]>>('/manage/reseller-applications', { params: status ? { status } : {} })),
  decideApplication: (id: string, decision: 'approved' | 'rejected', note?: string, resellerCode?: string) =>
    unwrap(http.post<Data<ResellerApplication>>(`/manage/reseller-applications/${id}/decision`, {
      decision, ...(note ? { note } : {}), ...(resellerCode ? { resellerCode } : {}),
    })),
  audit: (params: { page?: number; limit?: number; action?: string } = {}) =>
    unwrap(http.get<Data<Paginated<AuditEntry>>>('/manage/audit', { params })),
};

export const servicesApi = {
  mine: () => unwrap(http.get<Data<ServiceEntry[]>>('/services')),
  publicCatalog: () => unwrap(http.get<Data<CatalogService[]>>('/services/public')),
  setEnabled: (key: string, enabled: boolean) => unwrap(http.put<Data<unknown>>(`/services/${key}/enabled`, { enabled })),
  forUser: (userId: string) => unwrap(http.get<Data<ServiceEntry[]>>(`/services/users/${userId}`)),
  assign: (userId: string, key: string, allowed: boolean) =>
    unwrap(http.put<Data<unknown>>(`/services/users/${userId}/${key}`, { allowed })),
  catalog: () => unwrap(http.get<Data<CatalogService[]>>('/services/catalog')),
  updateCatalog: (key: string, body: Partial<Omit<CatalogService, 'key' | 'category' | 'unitLabel'>>) =>
    unwrap(http.patch<Data<CatalogService>>(`/services/catalog/${key}`, body)),
};

export type PageParams = { page?: number; limit?: number; serviceKey?: string } & Record<string, unknown>;

export const billingApi = {
  summary: () => unwrap(http.get<Data<BillingSummary>>('/billing/summary')),
  ledger: (params: PageParams = {}) => unwrap(http.get<Data<Paginated<LedgerEntry>>>('/billing/ledger', { params })),
  usage: (params: PageParams = {}) => unwrap(http.get<Data<Paginated<UsageRecord>>>('/billing/usage', { params })),
  invoices: (params: { status?: string; userId?: string; page?: number } = {}) =>
    unwrap(http.get<Data<Paginated<Invoice>>>('/billing/invoices', { params })),
  payInvoice: (id: string, method: 'wallet' | 'provider' | 'offline', reference?: string) =>
    unwrap(http.post<Data<Invoice>>(`/billing/invoices/${id}/pay`, { method, ...(reference ? { reference } : {}) })),
  transfer: (toUserId: string, amount: number, note = '') =>
    unwrap(http.post<Data<{ transferId: string }>>('/billing/transfers', { toUserId, amount, note })),
  topUp: (userId: string, amount: number, reference: string) =>
    unwrap(http.post<Data<unknown>>('/billing/topups', { userId, amount, reference })),
  adjust: (userId: string, direction: 'credit' | 'debit', amount: number, reason: string) =>
    unwrap(http.post<Data<unknown>>('/billing/adjustments', { userId, direction, amount, reason })),
  userSummary: (id: string) => unwrap(http.get<Data<BillingSummary>>(`/billing/users/${id}/summary`)),
  userLedger: (id: string, params: PageParams = {}) =>
    unwrap(http.get<Data<Paginated<LedgerEntry>>>(`/billing/users/${id}/ledger`, { params })),
  configure: (id: string, body: { mode?: BillingMode; creditLimit?: number | null; cycleDay?: number }) =>
    unwrap(http.patch<Data<BillingAccountSummary>>(`/billing/users/${id}/config`, body)),
  closeCycle: (id: string) => unwrap(http.post<Data<Invoice | null>>(`/billing/users/${id}/close-cycle`, {})),
  rules: (resellerId?: string) =>
    unwrap(http.get<Data<PriceRule[]>>('/billing/pricing/rules', { params: resellerId ? { resellerId } : {} })),
  setResellerMarkup: (resellerId: string, body: { serviceKey: string; type: MarkupType; value: number }) =>
    unwrap(http.put<Data<PriceRule>>(`/billing/pricing/resellers/${resellerId}`, body)),
  setCustomerMarkup: (body: { serviceKey: string; type: MarkupType; value: number; customerId: string | null }) =>
    unwrap(http.put<Data<PriceRule>>('/billing/pricing/customers', body)),
  deleteRule: (id: string) => unwrap(http.delete<Data<unknown>>(`/billing/pricing/rules/${id}`)),
  platformReport: () => unwrap(http.get<Data<PlatformOverview>>('/billing/reports/platform')),
  resellerReport: () => unwrap(http.get<Data<ResellerEarnings>>('/billing/reports/reseller')),
  runCycles: () => unwrap(http.post<Data<{ checked: number; issued: number }>>('/billing/cycles/run', {})),
};
