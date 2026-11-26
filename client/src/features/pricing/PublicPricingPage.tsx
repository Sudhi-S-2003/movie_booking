import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { SEO } from '../../components/common/SEO.js';
import { servicesApi } from '../../services/api/platform.api.js';
import { formatMoney } from '../../utils/money.js';
import { useAuthStore } from '../../store/authStore.js';
import { SITE_CONFIG } from '../../config/site.config.js';
import { dashboardPrefix } from '../platform/useAccount.js';
import { Badge, QueryState } from '../platform/ui.js';

/**
 * Public pay-as-you-go price list. Shows the platform base price per unit;
 * accounts under a reseller see their reseller's prices on their Services page.
 */
export const PublicPricingPage = () => {
  const { isAuthenticated, user } = useAuthStore();
  const q = useQuery({ queryKey: ['services', 'public'], queryFn: servicesApi.publicCatalog });
  const services = q.data ?? [];
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <SEO title="Pricing" description={`Pay-as-you-go pricing for ${SITE_CONFIG.name} services.`} />
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Simple, usage-based pricing</h1>
        <p className="mt-3 text-base text-slate-400">
          One account, every service. Enable what you need and pay only for what you use — prepaid from your wallet or invoiced monthly.
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-300">
          {['No subscription required', 'Prepaid or postpaid billing', 'Resell to your own customers'].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" aria-hidden />{t}</li>
          ))}
        </ul>
        <div className="mt-6">
          {isAuthenticated ? (
            <Link to={`${dashboardPrefix(user?.role)}/services`} className="inline-flex rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Manage my services</Link>
          ) : (
            <Link to="/register" className="inline-flex rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Create a free account</Link>
          )}
        </div>
      </header>

      <div className="mt-10">
        <QueryState isLoading={q.isLoading} error={q.error} isEmpty={!services.length} emptyText="No services are available yet." onRetry={() => void q.refetch()}>
          <div className="space-y-8">
            {categories.map((cat) => (
              <section key={cat} aria-labelledby={`price-${cat}`}>
                <h2 id={`price-${cat}`} className="mb-3 text-sm font-semibold capitalize text-slate-400">{cat}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.filter((s) => s.category === cat).map((s) => (
                    <article key={s.key} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-white">{s.name}</h3>
                        {s.status === 'beta' && <Badge value="beta" />}
                      </div>
                      <p className="mt-1 flex-1 text-sm text-slate-400">{s.description}</p>
                      <p className="mt-4 text-white">
                        {s.basePrice === 0
                          ? <span className="text-xl font-bold">Free</span>
                          : <><span className="text-xl font-bold tabular-nums">{formatMoney(s.basePrice)}</span><span className="text-sm text-slate-400"> / {s.unitLabel}</span></>}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </QueryState>
      </div>

      <p className="mt-10 text-center text-xs text-slate-500">
        Prices exclude applicable taxes. If you buy through a reseller, your reseller sets your price.
      </p>
    </div>
  );
};
