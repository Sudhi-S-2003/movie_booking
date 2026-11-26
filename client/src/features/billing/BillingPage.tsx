import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { billingApi } from '../../services/api/platform.api.js';
import { formatMoney } from '../../utils/money.js';
import { toast } from '../../utils/toast.js';
import { useBilling } from '../../providers/billingContext.js';
import type { BillingSummary, Invoice } from '../../types/platform.js';
import { Badge, Button, Pager, Panel, QueryState, StatCard } from '../platform/ui.js';
import { errorMessage, formatDate } from '../platform/format.js';

const TABS = ['usage', 'ledger', 'invoices'] as const;
type Tab = (typeof TABS)[number];

const AccountStats = ({ summary }: { summary: BillingSummary }) => {
  const a = summary.account;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Billing mode" value={a.isUnlimited ? 'Unlimited' : a.mode === 'prepaid' ? 'Prepaid' : 'Postpaid'} hint={a.state === 'frozen' ? 'Spending frozen' : undefined} tone={a.state === 'frozen' ? 'warn' : 'default'} />
      <StatCard label="Wallet balance" value={a.isUnlimited ? '∞' : formatMoney(a.balance)} tone={!a.isUnlimited && a.mode === 'prepaid' && a.balance <= 0 ? 'bad' : 'default'} />
      {a.mode === 'postpaid' ? (
        <>
          <StatCard label="Current cycle (unbilled)" value={formatMoney(a.unbilled)} hint={`Cycle closes on day ${a.cycleDay}`} />
          <StatCard label="Outstanding invoices" value={formatMoney(a.outstanding)} hint={a.availableCredit !== null ? `${formatMoney(a.availableCredit)} credit available` : 'No credit limit'} tone={a.outstanding > 0 ? 'warn' : 'default'} />
        </>
      ) : (
        <>
          <StatCard label="Earnings (lifetime)" value={formatMoney(a.lifetimeEarnings)} tone="good" />
          <StatCard label="Pending earnings" value={formatMoney(a.pendingEarnings)} hint="From postpaid customers, credited when they pay" />
        </>
      )}
    </div>
  );
};

const UsageTab = () => {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['billing', 'usage', page], queryFn: () => billingApi.usage({ page }) });
  return (
    <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!q.data?.items.length} emptyText="No usage yet" onRetry={() => void q.refetch()}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="py-2">When</th><th>Service</th><th className="text-right">Units</th><th className="text-right">Unit price</th><th className="text-right">Total</th><th>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {q.data?.items.map((u) => (
              <tr key={u._id}>
                <td className="py-2 text-slate-400">{formatDate(u.createdAt)}</td>
                <td>{u.serviceKey}</td>
                <td className="text-right tabular-nums">{u.units.toLocaleString()}</td>
                <td className="text-right tabular-nums">{formatMoney(u.unitPrice)}</td>
                <td className="text-right tabular-nums font-semibold">{u.unlimited ? '—' : formatMoney(u.total)}</td>
                <td><Badge value={u.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={q.data?.pagination.totalPages ?? 1} onChange={setPage} />
    </QueryState>
  );
};

const LedgerTab = () => {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['billing', 'ledger', page], queryFn: () => billingApi.ledger({ page }) });
  return (
    <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!q.data?.items.length} emptyText="No wallet movements yet" onRetry={() => void q.refetch()}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="py-2">When</th><th>Description</th><th>Type</th><th className="text-right">Amount</th><th className="text-right">Balance after</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {q.data?.items.map((e) => (
              <tr key={e._id}>
                <td className="py-2 text-slate-400">{formatDate(e.createdAt)}</td>
                <td>{e.description}</td>
                <td><Badge value={e.kind} /></td>
                <td className={`text-right tabular-nums font-semibold ${e.direction === 'credit' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {e.direction === 'credit' ? '+' : '−'}{formatMoney(e.amount)}
                </td>
                <td className="text-right tabular-nums text-slate-400">{e.balanceAfter === null ? '∞' : formatMoney(e.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={q.data?.pagination.totalPages ?? 1} onChange={setPage} />
    </QueryState>
  );
};

const InvoicesTab = () => {
  const qc = useQueryClient();
  const { refresh } = useBilling();
  const q = useQuery({ queryKey: ['billing', 'invoices'], queryFn: () => billingApi.invoices({}) });
  const pay = useMutation({
    mutationFn: (inv: Invoice) => billingApi.payInvoice(inv._id, 'wallet'),
    onSuccess: () => {
      toast.success('Invoice paid');
      void qc.invalidateQueries({ queryKey: ['billing'] });
      void refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!q.data?.items.length} emptyText="No invoices. Postpaid accounts receive one at the end of each cycle." onRetry={() => void q.refetch()}>
      <ul className="divide-y divide-white/5">
        {q.data?.items.map((inv) => (
          <li key={inv._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">{inv.number}</p>
              <p className="text-xs text-slate-500">
                {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()} · due {new Date(inv.dueAt).toLocaleDateString()}
                {typeof inv.userId === 'object' && ` · ${inv.userId.name}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular-nums font-bold">{formatMoney(inv.total)}</span>
              <Badge value={inv.status} />
              {inv.status === 'issued' && (
                <Button variant="secondary" loading={pay.isPending && pay.variables?._id === inv._id} onClick={() => pay.mutate(inv)}>Pay from wallet</Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </QueryState>
  );
};

export const BillingPage = () => {
  const [tab, setTab] = useState<Tab>('usage');
  const summary = useQuery({ queryKey: ['billing', 'summary'], queryFn: billingApi.summary });

  return (
    <DashboardPage title="Wallet" accent="& Billing" icon={<Wallet size={20} />} subtitle="Balance, usage charges, wallet ledger and invoices.">
      <SEO title="Wallet & Billing" description="Wallet balance, usage and invoices." />
      <div className="space-y-6">
        <QueryState isLoading={summary.isLoading} error={summary.error} onRetry={() => void summary.refetch()}>
          {summary.data && <AccountStats summary={summary.data} />}
          {summary.data && summary.data.usageByService.length > 0 && (
            <Panel title="Last 30 days by service" className="mt-6">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {summary.data.usageByService.map((u) => (
                  <li key={u._id} className="flex justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                    <span>{u._id}</span><span className="tabular-nums font-semibold">{formatMoney(u.total)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </QueryState>

        <Panel>
          <div role="tablist" aria-label="Billing sections" className="mb-4 flex gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${tab === t ? 'bg-sky-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'usage' && <UsageTab />}
          {tab === 'ledger' && <LedgerTab />}
          {tab === 'invoices' && <InvoicesTab />}
        </Panel>
        <p className="text-xs text-slate-500">
          Need more credit? Your provider can transfer credit to your wallet. Online card payments are not enabled on this platform yet.
        </p>
      </div>
    </DashboardPage>
  );
};
