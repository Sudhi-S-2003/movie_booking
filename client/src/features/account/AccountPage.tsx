import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleUser } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { accountApi } from '../../services/api/platform.api.js';
import { toast } from '../../utils/toast.js';
import { useAccount, ACCOUNT_QUERY_KEY, ROLE_LABELS } from '../platform/useAccount.js';
import { Badge, Button, Field, Input, Panel, QueryState } from '../platform/ui.js';
import { errorMessage } from '../platform/format.js';

const ResellerApplicationPanel = () => {
  const qc = useQueryClient();
  const app = useQuery({ queryKey: ['account', 'application'], queryFn: accountApi.myApplication });
  const [businessName, setBusinessName] = useState('');
  const [website, setWebsite] = useState('');
  const [note, setNote] = useState('');
  const apply = useMutation({
    mutationFn: () => accountApi.applyReseller({ businessName, ...(website ? { website } : {}), ...(note ? { note } : {}) }),
    onSuccess: () => { toast.success('Application submitted'); void qc.invalidateQueries({ queryKey: ['account', 'application'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); apply.mutate(); };

  return (
    <QueryState isLoading={app.isLoading} error={app.error} onRetry={() => void app.refetch()}>
      {app.data?.status === 'pending' ? (
        <p className="text-sm text-slate-300">Your application for <strong>{app.data.businessName}</strong> is <Badge value="pending" /> — we'll review it shortly.</p>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {app.data?.status === 'rejected' && <p className="text-sm text-amber-300 sm:col-span-2">Your previous application was not approved{app.data.decisionNote ? `: ${app.data.decisionNote}` : ''}. You can apply again.</p>}
          <p className="text-sm text-slate-400 sm:col-span-2">Resell platform services to your own customers with your own pricing. Your markup on their usage is credited to your wallet.</p>
          <Field label="Business name"><Input required minLength={2} value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></Field>
          <Field label="Website (optional)"><Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></Field>
          <Field label="Tell us about your customers (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex items-end"><Button type="submit" loading={apply.isPending}>Apply to become a reseller</Button></div>
        </form>
      )}
    </QueryState>
  );
};

export const AccountPage = () => {
  const qc = useQueryClient();
  const me = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => accountApi.updateMe({ ...(name !== null ? { name } : {}), ...(brandName !== null ? { brandName } : {}) }),
    onSuccess: () => { toast.success('Profile saved'); setName(null); setBrandName(null); void qc.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const a = me.data;

  return (
    <DashboardPage title="My" accent="Account" icon={<CircleUser size={20} />}>
      <SEO title="My account" description="Profile and account settings" />
      <QueryState isLoading={me.isLoading} error={me.error} onRetry={() => void me.refetch()}>
        {a && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Profile">
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
                <Field label="Name"><Input value={name ?? a.name} onChange={(e) => setName(e.target.value)} /></Field>
                {(a.role === 'reseller' || a.role === 'super_admin') && (
                  <Field label="Brand name" hint="Shown to your customers as their provider"><Input value={brandName ?? a.brandName ?? ''} onChange={(e) => setBrandName(e.target.value)} /></Field>
                )}
                <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-slate-500">Email</dt><dd className="break-all">{a.email}</dd>
                  <dt className="text-slate-500">Account type</dt><dd>{ROLE_LABELS[a.role]}{a.isProtected && ' · protected'}</dd>
                  <dt className="text-slate-500">Provider</dt><dd>{a.provider?.name ?? 'Platform'}</dd>
                  {a.resellerCode && <><dt className="text-slate-500">Customer signup code</dt><dd className="font-mono">{a.resellerCode}</dd></>}
                </dl>
                <Button type="submit" loading={save.isPending} disabled={name === null && brandName === null}>Save</Button>
              </form>
            </Panel>
            {a.role === 'user' && <Panel title="Become a reseller"><ResellerApplicationPanel /></Panel>}
            {a.resellerCode && (
              <Panel title="Invite customers">
                <p className="text-sm text-slate-300">Customers who sign up with your code are added to your account automatically:</p>
                <p className="mt-3 break-all rounded-xl bg-slate-950/60 px-3 py-2 font-mono text-sm">{`${window.location.origin}/register?ref=${a.resellerCode}`}</p>
              </Panel>
            )}
          </div>
        )}
      </QueryState>
    </DashboardPage>
  );
};
