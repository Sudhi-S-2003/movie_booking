import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { manageApi } from '../../services/api/platform.api.js';
import { Pager, Panel, QueryState } from '../platform/ui.js';
import { formatDate } from '../platform/format.js';

export const AuditPage = () => {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['manage', 'audit', page], queryFn: () => manageApi.audit({ page, limit: 30 }) });
  return (
    <DashboardPage title="Audit" accent="Log" icon={<ScrollText size={20} />} subtitle="Append-only record of privileged actions: accounts, services, pricing, wallets and billing.">
      <SEO title="Audit log" description="Privileged action history" />
      <Panel>
        <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!q.data?.items.length} emptyText="No audited actions yet" onRetry={() => void q.refetch()}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
              <tbody className="divide-y divide-white/5 align-top">
                {q.data?.items.map((e) => (
                  <tr key={e._id}>
                    <td className="py-2 text-slate-400 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                    <td>{e.actorId ? `${e.actorId.name} (${e.actorRole})` : e.actorRole}</td>
                    <td className="font-mono text-xs">{e.action}</td>
                    <td className="font-mono text-xs">{e.targetType}{e.targetId ? `:${e.targetId.slice(-8)}` : ''}</td>
                    <td className="max-w-[320px] truncate font-mono text-xs text-slate-400" title={e.changes ? JSON.stringify(e.changes) : ''}>{e.changes ? JSON.stringify(e.changes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={q.data?.pagination.totalPages ?? 1} onChange={setPage} />
        </QueryState>
      </Panel>
    </DashboardPage>
  );
};
