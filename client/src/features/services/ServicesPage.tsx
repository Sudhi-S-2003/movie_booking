import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { servicesApi } from '../../services/api/platform.api.js';
import { toast } from '../../utils/toast.js';
import { formatMoney } from '../../utils/money.js';
import type { ServiceEntry, AccessReason } from '../../types/platform.js';
import { Badge, Button, QueryState } from '../platform/ui.js';
import { errorMessage } from '../platform/format.js';

const REASON_TEXT: Record<AccessReason, string> = {
  unknown_service: 'Unknown service',
  service_disabled: 'Temporarily unavailable on the platform',
  account_inactive: 'Your account is not active',
  not_assigned: 'Not included in your plan — ask your provider to enable it',
  provider_not_assigned: 'Your provider does not offer this service',
  not_enabled: 'Switched off',
};

const ServiceCard = ({ service }: { service: ServiceEntry }) => {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => servicesApi.setEnabled(service.key, enabled),
    onSuccess: (_d, enabled) => {
      toast.success(`${service.name} ${enabled ? 'enabled' : 'disabled'}`);
      void qc.invalidateQueries({ queryKey: ['services', 'mine'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const blocked = !service.allowed;
  return (
    <article className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white">{service.name}</h3>
          <Badge value={service.usable ? 'active' : blocked ? 'disabled' : 'pending'} label={service.usable ? 'On' : blocked ? 'Unavailable' : 'Off'} />
        </div>
        <p className="text-sm text-slate-400">{service.description}</p>
        <p className="text-xs text-slate-500">
          {service.unitPrice === 0 ? 'Free' : service.unitPrice != null ? `${formatMoney(service.unitPrice)} per ${service.unitLabel}` : 'Price unavailable'}
          {service.status === 'beta' && ' · Beta'}
        </p>
        {!service.usable && service.reason && <p className="text-xs text-amber-300/90">{REASON_TEXT[service.reason]}</p>}
      </div>
      <div>
        {service.allowed && (
          <Button
            variant={service.enabled ? 'secondary' : 'primary'}
            loading={toggle.isPending}
            onClick={() => toggle.mutate(!service.enabled)}
            aria-label={`${service.enabled ? 'Disable' : 'Enable'} ${service.name}`}
          >
            {service.enabled ? 'Disable' : 'Enable'}
          </Button>
        )}
      </div>
    </article>
  );
};

export const ServicesPage = () => {
  const query = useQuery({ queryKey: ['services', 'mine'], queryFn: servicesApi.mine });
  const services = query.data ?? [];
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <DashboardPage title="Services" accent="Catalog" icon={<Boxes size={20} />} subtitle="Enable the services you need. Usage is billed to your wallet at the prices shown.">
      <SEO title="Services" description="Enable and manage platform services." />
      <QueryState isLoading={query.isLoading} error={query.error} isEmpty={!services.length} onRetry={() => void query.refetch()}>
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {services.filter((s) => s.category === cat).map((s) => <ServiceCard key={s.key} service={s} />)}
              </div>
            </section>
          ))}
        </div>
      </QueryState>
    </DashboardPage>
  );
};
