import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { manageApi, type CreateUserBody } from '../../services/api/platform.api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { toast } from '../../utils/toast.js';
import type { Role } from '../../types/platform.js';
import { useAccount, can, isStaffRole, ROLE_LABELS, dashboardPrefix } from '../platform/useAccount.js';
import { Badge, Button, Field, Input, Pager, Panel, QueryState, Select } from '../platform/ui.js';
import { errorMessage, formatDate } from '../platform/format.js';

const CreateAccountForm = ({ onDone, canCreateReseller }: { onDone: () => void; canCreateReseller: boolean }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateUserBody>({ name: '', username: '', email: '', password: '', role: 'user' });
  const create = useMutation({
    mutationFn: () => manageApi.createUser(form),
    onSuccess: (acc) => {
      toast.success(`${acc.name} created`);
      void qc.invalidateQueries({ queryKey: ['manage', 'users'] });
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const set = (k: keyof CreateUserBody) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name"><Input required value={form.name} onChange={set('name')} autoComplete="off" /></Field>
      <Field label="Username" hint="3–30 letters, numbers or underscores"><Input required value={form.username} onChange={set('username')} pattern="[A-Za-z0-9_]{3,30}" /></Field>
      <Field label="Email"><Input required type="email" value={form.email} onChange={set('email')} /></Field>
      <Field label="Initial password" hint="8+ characters with a letter and a number. Share it securely."><Input required type="password" minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
      {canCreateReseller && (
        <Field label="Account type">
          <Select value={form.role} onChange={set('role')}>
            <option value="user">Customer</option>
            <option value="reseller">Reseller</option>
          </Select>
        </Field>
      )}
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit" loading={create.isPending}>Create account</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
};

export const CustomersPage = () => {
  const { data: me } = useAccount();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebounce(q, 300);
  const staff = isStaffRole(me?.role);

  const list = useQuery({
    queryKey: ['manage', 'users', search, role, page],
    queryFn: () => manageApi.listUsers({ ...(search ? { q: search } : {}), ...(role ? { role } : {}), page, limit: 20 }),
    enabled: !!me,
  });
  const prefix = dashboardPrefix(me?.role);
  const title = staff ? 'Accounts' : 'Customers';

  return (
    <DashboardPage
      title={title}
      icon={<Users size={20} />}
      subtitle={staff ? 'Every account on the platform.' : 'Accounts you provide services to.'}
      headerActions={can(me, 'users.create') && !creating ? <Button onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" aria-hidden /> New account</Button> : undefined}
    >
      <SEO title={title} description="Manage accounts" />
      <div className="space-y-6">
        {creating && (
          <Panel title="New account">
            <CreateAccountForm onDone={() => setCreating(false)} canCreateReseller={can(me, 'resellers.create_sub') || can(me, 'resellers.promote')} />
          </Panel>
        )}
        <Panel>
          <div className="mb-4 flex flex-wrap gap-3">
            <Input aria-label="Search accounts" placeholder="Search name, email or username" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
            {staff && (
              <Select aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }} className="max-w-[180px]">
                <option value="">All roles</option>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            )}
          </div>
          <QueryState isLoading={list.isLoading} error={list.error} isEmpty={!list.data?.items.length} emptyText={search ? 'No matching accounts' : 'No accounts yet'} onRetry={() => void list.refetch()}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2">Account</th><th>Role</th><th>Status</th><th>Joined</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.data?.items.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3">
                        <Link to={`${prefix}/customers/${u.id}`} className="font-semibold text-white hover:text-sky-300">{u.name}</Link>
                        <p className="text-xs text-slate-500">@{u.username} · {u.email}</p>
                      </td>
                      <td>{ROLE_LABELS[u.role]}{u.isProtected && ' · protected'}</td>
                      <td><Badge value={u.status} /></td>
                      <td className="text-slate-400">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} totalPages={list.data?.pagination.totalPages ?? 1} onChange={setPage} />
          </QueryState>
        </Panel>
      </div>
    </DashboardPage>
  );
};
