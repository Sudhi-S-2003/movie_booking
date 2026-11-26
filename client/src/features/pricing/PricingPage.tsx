import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tags } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { billingApi, manageApi, servicesApi } from '../../services/api/platform.api.js';
import { formatBps, formatMoney, MICROS } from '../../utils/money.js';
import { toast } from '../../utils/toast.js';
import type { CatalogService, MarkupType, PriceRule } from '../../types/platform.js';
import { useAccount, can, isResellerRole } from '../platform/useAccount.js';
import { Badge, Button, Field, Input, Panel, QueryState, Select } from '../platform/ui.js';
import { errorMessage, formatDate } from '../platform/format.js';

/** Convert the form's human value into the API's integer value. */
const toRuleValue = (type: MarkupType, raw: string): number | null => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return type === 'percent' ? Math.round(n * 100) : Math.round(n * MICROS); // % → bps, ₹ → micros
};
const describeRule = (r: Pick<PriceRule, 'type' | 'value'>) => (r.type === 'percent' ? `+${formatBps(r.value)}` : `+${formatMoney(r.value)} / unit`);

const CatalogRow = ({ service, canEditPrice }: { service: CatalogService; canEditPrice: boolean }) => {
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(service.basePrice / MICROS));
  const [status, setStatus] = useState(service.status);
  const save = useMutation({
    mutationFn: () => servicesApi.updateCatalog(service.key, {
      status,
      ...(canEditPrice ? { basePrice: Math.round(Number(price) * MICROS) } : {}),
    }),
    onSuccess: () => { toast.success(`${service.name} updated`); void qc.invalidateQueries({ queryKey: ['services'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <tr>
      <td className="py-2"><p className="font-semibold">{service.name}</p><p className="text-xs text-slate-500">{service.key} · per {service.unitLabel}</p></td>
      <td><Input aria-label={`${service.name} base price`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!canEditPrice} className="max-w-[140px]" /></td>
      <td>
        <Select aria-label={`${service.name} status`} value={status} onChange={(e) => setStatus(e.target.value as CatalogService['status'])} className="max-w-[140px]">
          <option value="active">Active</option><option value="beta">Beta</option><option value="disabled">Disabled</option>
        </Select>
      </td>
      <td className="text-right"><Button variant="secondary" loading={save.isPending} onClick={() => save.mutate()}>Save</Button></td>
    </tr>
  );
};

const MarkupForm = ({ services, onSubmit, pending, submitLabel, children }: {
  services: { key: string; name: string }[];
  onSubmit: (v: { serviceKey: string; type: MarkupType; value: number }) => void;
  pending: boolean; submitLabel: string; children?: React.ReactNode;
}) => {
  const [serviceKey, setServiceKey] = useState('*');
  const [type, setType] = useState<MarkupType>('percent');
  const [raw, setRaw] = useState('');
  return (
    <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => {
      e.preventDefault();
      const value = toRuleValue(type, raw);
      if (value === null) { toast.error('Enter a valid markup'); return; }
      onSubmit({ serviceKey, type, value });
    }}>
      {children}
      <Field label="Service">
        <Select value={serviceKey} onChange={(e) => setServiceKey(e.target.value)}>
          <option value="*">All services</option>
          {services.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Markup type">
        <Select value={type} onChange={(e) => setType(e.target.value as MarkupType)}>
          <option value="percent">Percent of price</option>
          <option value="fixed">Fixed ₹ per unit</option>
        </Select>
      </Field>
      <Field label={type === 'percent' ? 'Markup (%)' : 'Markup (₹ / unit)'}><Input required inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} /></Field>
      <div className="flex items-end"><Button type="submit" loading={pending}>{submitLabel}</Button></div>
    </form>
  );
};

const RulesList = ({ rules, nameOf }: { rules: PriceRule[]; nameOf: (r: PriceRule) => string }) => {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: string) => billingApi.deleteRule(id),
    onSuccess: () => { toast.success('Markup removed'); void qc.invalidateQueries({ queryKey: ['billing', 'rules'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!rules.length) return <p className="py-4 text-sm text-slate-500">No markups yet — the base price applies.</p>;
  return (
    <ul className="divide-y divide-white/5">
      {rules.map((r) => (
        <li key={r._id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
          <span>{nameOf(r)} · <span className="font-mono">{r.serviceKey === '*' ? 'all services' : r.serviceKey}</span></span>
          <span className="flex items-center gap-3"><span className="font-semibold">{describeRule(r)}</span>
            <span className="text-xs text-slate-500">{formatDate(r.updatedAt)}</span>
            <Button variant="ghost" loading={del.isPending && del.variables === r._id} onClick={() => del.mutate(r._id)}>Remove</Button></span>
        </li>
      ))}
    </ul>
  );
};

export const PricingPage = () => {
  const { data: me } = useAccount();
  const qc = useQueryClient();
  const canManageCatalog = can(me, 'services.manage');
  const canResellerMarkup = can(me, 'pricing.reseller_markup');
  const canCustomerMarkup = isResellerRole(me?.role) && can(me, 'pricing.customer_markup');

  const catalog = useQuery({ queryKey: ['services', 'catalog'], queryFn: servicesApi.catalog, enabled: canManageCatalog });
  const mine = useQuery({ queryKey: ['services', 'mine'], queryFn: servicesApi.mine, enabled: !!me });
  const rules = useQuery({ queryKey: ['billing', 'rules'], queryFn: () => billingApi.rules(), enabled: !!me });
  const resellers = useQuery({ queryKey: ['manage', 'users', 'resellers'], queryFn: () => manageApi.listUsers({ role: 'reseller', limit: 100 }), enabled: canResellerMarkup });
  const [resellerId, setResellerId] = useState('');

  const refresh = () => void qc.invalidateQueries({ queryKey: ['billing', 'rules'] });
  const setReseller = useMutation({
    mutationFn: (v: { serviceKey: string; type: MarkupType; value: number }) => billingApi.setResellerMarkup(resellerId, v),
    onSuccess: () => { toast.success('Reseller markup saved'); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const setCustomer = useMutation({
    mutationFn: (v: { serviceKey: string; type: MarkupType; value: number }) => billingApi.setCustomerMarkup({ ...v, customerId: null }),
    onSuccess: () => { toast.success('Customer markup saved'); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const services = (mine.data ?? []).map((s) => ({ key: s.key, name: s.name }));
  const resellerName = (id: string) => resellers.data?.items.find((r) => r.id === id)?.name ?? id.slice(-6);
  const resellerRules = (rules.data ?? []).filter((r) => r.scope === 'reseller');
  const customerRules = (rules.data ?? []).filter((r) => r.scope === 'customer' && r.resellerId === me?.id);

  return (
    <DashboardPage title="Pricing" icon={<Tags size={20} />} subtitle="Customer price = base price + reseller markup (set by the platform) + customer markup (set by the reseller).">
      <SEO title="Pricing" description="Service prices and markups" />
      <div className="space-y-6">
        {canManageCatalog && (
          <Panel title="Service catalog & base prices">
            <QueryState isLoading={catalog.isLoading} error={catalog.error} onRetry={() => void catalog.refetch()}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Service</th><th>Base price (₹ / unit)</th><th>Status</th><th /></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {catalog.data?.map((s) => <CatalogRow key={s.key} service={s} canEditPrice={can(me, 'pricing.manage')} />)}
                  </tbody>
                </table>
              </div>
            </QueryState>
          </Panel>
        )}

        {canResellerMarkup && (
          <Panel title="Reseller markups (platform-defined)">
            <MarkupForm services={services} onSubmit={(v) => { if (!resellerId) { toast.error('Choose a reseller'); return; } setReseller.mutate(v); }} pending={setReseller.isPending} submitLabel="Save markup">
              <Field label="Reseller">
                <Select value={resellerId} onChange={(e) => setResellerId(e.target.value)}>
                  <option value="">Select…</option>
                  {resellers.data?.items.map((r) => <option key={r.id} value={r.id}>{r.name} (@{r.username})</option>)}
                </Select>
              </Field>
            </MarkupForm>
            <div className="mt-4"><RulesList rules={resellerRules} nameOf={(r) => resellerName(r.resellerId)} /></div>
          </Panel>
        )}

        {canCustomerMarkup && (
          <Panel title="Your customer markups (default for all your customers)">
            <MarkupForm services={services} onSubmit={(v) => setCustomer.mutate(v)} pending={setCustomer.isPending} submitLabel="Save markup" />
            <div className="mt-4"><RulesList rules={customerRules} nameOf={(r) => (r.customerId ? `Customer …${r.customerId.slice(-6)}` : 'All customers')} /></div>
          </Panel>
        )}

        <Panel title="Your prices">
          <QueryState isLoading={mine.isLoading} error={mine.error} onRetry={() => void mine.refetch()}>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mine.data?.map((s) => (
                <li key={s.key} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <span>{s.name}</span>
                  <span className="flex items-center gap-2 tabular-nums">{s.unitPrice != null ? `${formatMoney(s.unitPrice)}/${s.unitLabel}` : '—'}{!s.allowed && <Badge value="disabled" label="n/a" />}</span>
                </li>
              ))}
            </ul>
          </QueryState>
        </Panel>
      </div>
    </DashboardPage>
  );
};
