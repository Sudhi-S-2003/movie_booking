import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCog } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { manageApi, servicesApi, billingApi } from '../../services/api/platform.api.js';
import { formatMoney, toMicros, MICROS } from '../../utils/money.js';
import { toast } from '../../utils/toast.js';
import type { BillingMode, ManagedAccount } from '../../types/platform.js';
import { useAccount, can, ROLE_LABELS, dashboardPrefix } from '../platform/useAccount.js';
import { Badge, Button, Field, Input, Panel, QueryState, Select, StatCard } from '../platform/ui.js';
import { errorMessage } from '../platform/format.js';

const useInvalidate = (id: string) => {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['manage', 'user', id] });
    void qc.invalidateQueries({ queryKey: ['manage', 'users'] });
    void qc.invalidateQueries({ queryKey: ['billing'] });
  };
};

const StatusActions = ({ account }: { account: ManagedAccount }) => {
  const { data: me } = useAccount();
  const invalidate = useInvalidate(account.id);
  const [reason, setReason] = useState('');
  const act = useMutation({
    mutationFn: async (action: 'suspend' | 'reactivate' | 'close' | 'make_reseller' | 'make_user' | 'make_admin') => {
      if (action === 'suspend') return manageApi.suspend(account.id, reason);
      if (action === 'close') return manageApi.close(account.id, reason);
      if (action === 'reactivate') return manageApi.reactivate(account.id);
      return manageApi.changeRole(account.id, action === 'make_reseller' ? 'reseller' : action === 'make_admin' ? 'admin' : 'user');
    },
    onSuccess: () => { toast.success('Account updated'); setReason(''); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (account.isProtected) return <p className="text-sm text-slate-400">This account is protected and cannot be changed.</p>;
  if (!account.canManage) return <p className="text-sm text-slate-400">You can view this account but not manage it.</p>;

  return (
    <div className="space-y-4">
      {account.status !== 'closed' && (
        <Field label="Reason (required to suspend or close)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. unpaid invoices" />
        </Field>
      )}
      <div className="flex flex-wrap gap-2">
        {account.status === 'active' && can(me, 'users.suspend') && (
          <Button variant="secondary" disabled={reason.trim().length < 3} loading={act.isPending} onClick={() => act.mutate('suspend')}>Suspend</Button>
        )}
        {account.status === 'suspended' && <Button loading={act.isPending} onClick={() => act.mutate('reactivate')}>Reactivate</Button>}
        {account.status !== 'closed' && can(me, 'users.close') && (
          <Button variant="danger" disabled={reason.trim().length < 3} loading={act.isPending}
            onClick={() => { if (window.confirm(`Close ${account.name}'s account? This cannot be undone.`)) act.mutate('close'); }}>Close account</Button>
        )}
        {can(me, 'resellers.promote') && account.role === 'user' && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate('make_reseller')}>Make reseller</Button>}
        {can(me, 'resellers.promote') && account.role === 'reseller' && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate('make_user')}>Make customer</Button>}
        {can(me, 'staff.manage') && account.role !== 'admin' && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate('make_admin')}>Make admin</Button>}
        {can(me, 'staff.manage') && account.role === 'admin' && <Button variant="secondary" loading={act.isPending} onClick={() => act.mutate('make_user')}>Remove admin</Button>}
      </div>
    </div>
  );
};

const ServicesPanel = ({ account }: { account: ManagedAccount }) => {
  const { data: me } = useAccount();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['services', 'user', account.id], queryFn: () => servicesApi.forUser(account.id) });
  const assign = useMutation({
    mutationFn: ({ key, allowed }: { key: string; allowed: boolean }) => servicesApi.assign(account.id, key, allowed),
    onSuccess: () => { toast.success('Services updated'); void qc.invalidateQueries({ queryKey: ['services', 'user', account.id] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const editable = account.canManage && can(me, 'services.assign');
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
      <ul className="divide-y divide-white/5">
        {q.data?.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="text-xs text-slate-500">{s.usable ? 'In use' : s.allowed ? 'Allowed, switched off by the account' : 'Not allowed'}</p>
            </div>
            {editable ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={s.allowed}
                  disabled={assign.isPending} onChange={(e) => assign.mutate({ key: s.key, allowed: e.target.checked })}
                  aria-label={`Allow ${s.name}`} />
                Allowed
              </label>
            ) : <Badge value={s.allowed ? 'active' : 'disabled'} label={s.allowed ? 'Allowed' : 'No'} />}
          </li>
        ))}
      </ul>
    </QueryState>
  );
};

const BillingPanel = ({ account }: { account: ManagedAccount }) => {
  const { data: me } = useAccount();
  const invalidate = useInvalidate(account.id);
  const summary = useQuery({ queryKey: ['billing', 'user', account.id], queryFn: () => billingApi.userSummary(account.id) });
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<BillingMode | ''>('');
  const [limit, setLimit] = useState('');
  const [reference, setReference] = useState('');

  const transfer = useMutation({
    mutationFn: () => {
      const micros = toMicros(amount);
      if (!micros) throw new Error('Enter a positive amount');
      return billingApi.transfer(account.id, micros, 'Credit transfer');
    },
    onSuccess: () => { toast.success('Credit transferred'); setAmount(''); invalidate(); void summary.refetch(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const topUp = useMutation({
    mutationFn: () => {
      const micros = toMicros(amount);
      if (!micros) throw new Error('Enter a positive amount');
      return billingApi.topUp(account.id, micros, reference);
    },
    onSuccess: () => { toast.success('Wallet topped up'); setAmount(''); setReference(''); void summary.refetch(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const configure = useMutation({
    mutationFn: () => billingApi.configure(account.id, {
      ...(mode ? { mode } : {}),
      ...(limit !== '' ? { creditLimit: Math.round(Number(limit) * MICROS) } : {}),
    }),
    onSuccess: () => { toast.success('Billing settings saved'); setMode(''); setLimit(''); void summary.refetch(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const closeCycle = useMutation({
    mutationFn: () => billingApi.closeCycle(account.id),
    onSuccess: (inv) => { toast.success(inv ? `Invoice ${inv.number} issued` : 'Nothing to bill'); void summary.refetch(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const a = summary.data?.account;
  return (
    <QueryState isLoading={summary.isLoading} error={summary.error} onRetry={() => void summary.refetch()}>
      {a && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Mode" value={a.isUnlimited ? 'Unlimited' : a.mode} />
            <StatCard label="Balance" value={a.isUnlimited ? '∞' : formatMoney(a.balance)} />
            <StatCard label={a.mode === 'postpaid' ? 'Unbilled + outstanding' : 'Lifetime earnings'}
              value={formatMoney(a.mode === 'postpaid' ? a.unbilled + a.outstanding : a.lifetimeEarnings)}
              hint={a.mode === 'postpaid' ? `Limit ${a.creditLimit === null ? 'none' : formatMoney(a.creditLimit)}` : undefined} />
          </div>

          {account.canManage && !a.isUnlimited && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Add credit</p>
                <Field label="Amount (₹)"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" /></Field>
                {can(me, 'wallet.mint') && (
                  <Field label="Payment reference (top-up)" hint="Bank/gateway reference for funds received">
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                  </Field>
                )}
                <div className="flex flex-wrap gap-2">
                  {can(me, 'wallet.transfer') && <Button loading={transfer.isPending} onClick={() => transfer.mutate()}>Transfer from my wallet</Button>}
                  {can(me, 'wallet.mint') && <Button variant="secondary" disabled={reference.trim().length < 3} loading={topUp.isPending} onClick={() => topUp.mutate()}>Record top-up</Button>}
                </div>
              </div>
              {can(me, 'billing.customers') && (
                <div className="space-y-3 rounded-2xl border border-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Billing settings</p>
                  <Field label="Billing mode">
                    <Select value={mode} onChange={(e) => setMode(e.target.value as BillingMode | '')}>
                      <option value="">Keep {a.mode}</option>
                      <option value="prepaid">Prepaid (deduct before use)</option>
                      <option value="postpaid">Postpaid (invoice each cycle)</option>
                    </Select>
                  </Field>
                  <Field label="Postpaid credit limit (₹)"><Input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={a.creditLimit !== null ? String(a.creditLimit / MICROS) : 'no limit'} /></Field>
                  <div className="flex flex-wrap gap-2">
                    <Button loading={configure.isPending} disabled={!mode && limit === ''} onClick={() => configure.mutate()}>Save</Button>
                    {a.mode === 'postpaid' && <Button variant="secondary" loading={closeCycle.isPending} onClick={() => closeCycle.mutate()}>Invoice now</Button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </QueryState>
  );
};

export const CustomerDetailPage = () => {
  const { id = '' } = useParams();
  const { data: me } = useAccount();
  const q = useQuery({ queryKey: ['manage', 'user', id], queryFn: () => manageApi.getUser(id), enabled: !!id });
  const account = q.data;

  return (
    <DashboardPage title={account?.name ?? 'Account'} icon={<UserCog size={20} />}
      headerActions={<Link to={`${dashboardPrefix(me?.role)}/customers`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden /> All accounts</Link>}>
      <SEO title="Account details" description="Manage an account" />
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        {account && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Profile">
              <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-slate-500">Username</dt><dd>@{account.username}</dd>
                <dt className="text-slate-500">Email</dt><dd className="break-all">{account.email}</dd>
                <dt className="text-slate-500">Role</dt><dd>{ROLE_LABELS[account.role]}</dd>
                <dt className="text-slate-500">Status</dt><dd><Badge value={account.status} />{account.suspendedReason && <span className="ml-2 text-xs text-slate-400">{account.suspendedReason}</span>}</dd>
                <dt className="text-slate-500">Provider</dt><dd>{account.parent ? `${account.parent.name} (@${account.parent.username})` : 'Platform'}</dd>
                {account.role === 'reseller' && <><dt className="text-slate-500">Customers</dt><dd>{account.customerCount}</dd></>}
                {account.resellerCode && <><dt className="text-slate-500">Signup code</dt><dd className="font-mono">{account.resellerCode}</dd></>}
              </dl>
            </Panel>
            <Panel title="Account status & role"><StatusActions account={account} /></Panel>
            <Panel title="Services"><ServicesPanel account={account} /></Panel>
            <Panel title="Wallet & billing"><BillingPanel account={account} /></Panel>
          </div>
        )}
      </QueryState>
    </DashboardPage>
  );
};
