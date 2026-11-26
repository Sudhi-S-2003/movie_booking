import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { manageApi } from '../../services/api/platform.api.js';
import { toast } from '../../utils/toast.js';
import { Badge, Button, Panel, QueryState, Select } from '../platform/ui.js';
import { errorMessage, formatDate } from '../platform/format.js';

export const ApplicationsPage = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const q = useQuery({ queryKey: ['manage', 'applications', status], queryFn: () => manageApi.applications(status || undefined) });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => manageApi.decideApplication(id, decision),
    onSuccess: (_d, v) => { toast.success(v.decision === 'approved' ? 'Approved — the account is now a reseller' : 'Application rejected'); void qc.invalidateQueries({ queryKey: ['manage'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <DashboardPage title="Reseller" accent="Applications" icon={<BadgeCheck size={20} />} subtitle="Customers who asked to resell platform services.">
      <SEO title="Reseller applications" description="Approve or reject reseller applications" />
      <Panel actions={
        <Select aria-label="Filter applications" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option>
        </Select>
      }>
        <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!q.data?.length} emptyText="No applications" onRetry={() => void q.refetch()}>
          <ul className="divide-y divide-white/5">
            {q.data?.map((a) => (
              <li key={a._id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="space-y-1">
                  <p className="font-semibold">{a.businessName} {a.website && <a href={a.website} target="_blank" rel="noreferrer noopener" className="ml-2 text-xs text-sky-300 underline">{a.website}</a>}</p>
                  {typeof a.userId === 'object' && <p className="text-xs text-slate-400">{a.userId.name} · {a.userId.email}</p>}
                  {a.note && <p className="max-w-prose text-sm text-slate-300">{a.note}</p>}
                  <p className="text-xs text-slate-500">{formatDate(a.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={a.status} />
                  {a.status === 'pending' && (
                    <>
                      <Button loading={decide.isPending && decide.variables?.id === a._id} onClick={() => decide.mutate({ id: a._id, decision: 'approved' })}>Approve</Button>
                      <Button variant="secondary" loading={decide.isPending && decide.variables?.id === a._id} onClick={() => decide.mutate({ id: a._id, decision: 'rejected' })}>Reject</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </QueryState>
      </Panel>
    </DashboardPage>
  );
};
