import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { billingApi } from '../../services/api/platform.api.js';
import { formatMoney } from '../../utils/money.js';
import { toast } from '../../utils/toast.js';
import { useAccount, can } from '../platform/useAccount.js';
import { Badge, Button, Panel, QueryState, StatCard } from '../platform/ui.js';
import { errorMessage, formatDate } from '../platform/format.js';

export const PlatformOverviewPage = () => {
  const { data: me } = useAccount();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['billing', 'platform-report'], queryFn: billingApi.platformReport });
  const run = useMutation({
    mutationFn: billingApi.runCycles,
    onSuccess: (r) => { toast.success(`Checked ${r.checked} postpaid accounts, issued ${r.issued} invoice(s)`); void qc.invalidateQueries({ queryKey: ['billing'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const d = q.data;

  return (
    <DashboardPage title="Platform" accent="Overview" icon={<LayoutDashboard size={20} />} subtitle="Accounts, revenue and billing across the whole platform (last 30 days)."
      headerActions={can(me, 'billing.manage') ? <Button variant="secondary" loading={run.isPending} onClick={() => run.mutate()}>Run billing cycles</Button> : undefined}>
      <SEO title="Platform overview" description="Platform-wide metrics" />
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Accounts" value={d.users.total.toLocaleString()} hint={`${d.users.resellers} resellers · ${d.users.admins} admins`} />
              <StatCard label="Gross usage billed" value={formatMoney(d.usage.gross)} hint={`${d.usage.charges.toLocaleString()} charges`} />
              <StatCard label="Platform revenue" value={formatMoney(d.usage.platformRevenue)} tone="good" hint="Base price + reseller markups" />
              <StatCard label="Outstanding invoices" value={formatMoney(d.outstandingInvoices.total)} hint={`${d.outstandingInvoices.count} unpaid`} tone={d.outstandingInvoices.total > 0 ? 'warn' : 'default'} />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Revenue by service">
                {d.revenueByService.length === 0 ? <p className="text-sm text-slate-500">No billed usage in this period.</p> : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Service</th><th className="text-right">Units</th><th className="text-right">Gross</th><th className="text-right">Platform</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {d.revenueByService.map((r) => (
                        <tr key={r._id}><td className="py-2">{r._id}</td><td className="text-right tabular-nums">{r.units.toLocaleString()}</td>
                          <td className="text-right tabular-nums">{formatMoney(r.gross)}</td><td className="text-right tabular-nums">{formatMoney(r.platform)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
              <Panel title="Wallets">
                <ul className="space-y-2 text-sm">
                  {d.walletsByMode.map((w) => (
                    <li key={w._id} className="flex justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                      <span className="capitalize">{w._id} ({w.count})</span>
                      <span className="tabular-nums">{formatMoney(w.balance)} held{w._id === 'postpaid' && ` · ${formatMoney(w.unbilled)} unbilled`}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
            <Panel title="Recent invoices">
              {d.recentInvoices.length === 0 ? <p className="text-sm text-slate-500">No invoices yet.</p> : (
                <ul className="divide-y divide-white/5">
                  {d.recentInvoices.map((inv) => (
                    <li key={inv._id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                      <span>{inv.number} · {typeof inv.userId === 'object' ? inv.userId.name : ''}</span>
                      <span className="flex items-center gap-3"><span className="tabular-nums">{formatMoney(inv.total)}</span><Badge value={inv.status} /><span className="text-xs text-slate-500">{formatDate(inv.periodEnd)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </QueryState>
    </DashboardPage>
  );
};
