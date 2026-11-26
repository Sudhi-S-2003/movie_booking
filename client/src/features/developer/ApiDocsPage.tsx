import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Check, Copy, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { DashboardPage } from '../../components/dashboard/DashboardPage.js';
import { SEO } from '../../components/common/SEO.js';
import { env } from '../../config/env.js';
import { cn } from '../../utils/cn.js';
import { useAuthStore } from '../../store/authStore.js';
import { dashboardPrefix } from '../platform/useAccount.js';
import { Panel } from '../platform/ui.js';
import { API_SERVICES, ERROR_CODES, type EndpointDoc, type FieldDoc, type ServiceDoc } from './apiCatalog.js';

const BASE_URL = env.VITE_API_URL;

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  POST: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const CodeBlock = ({ code, label }: { code: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-xs text-slate-400">{label ?? 'Example'}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10" aria-label={`Copy ${label ?? 'code'}`}>
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-3 text-[12.5px] leading-relaxed text-slate-200"><code>{code}</code></pre>
    </div>
  );
};

const FieldTable = ({ title, fields }: { title: string; fields: FieldDoc[] }) => (
  <div>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-white/[0.03] text-xs text-slate-400"><tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Description</th></tr></thead>
        <tbody className="divide-y divide-white/5">
          {fields.map((f) => (
            <tr key={f.name} className="align-top">
              <td className="px-3 py-2 font-mono text-[13px] text-white">{f.name}{f.required && <span className="ml-1 text-rose-300" title="Required">*</span>}</td>
              <td className="px-3 py-2 font-mono text-xs text-sky-300">{f.type}</td>
              <td className="px-3 py-2 text-slate-300">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/** curl + fetch samples generated from the endpoint definition. */
const samples = (ep: EndpointDoc) => {
  const url = `${BASE_URL}${ep.path.replace(':id', '<ID>')}`;
  const qs = ep.auth === 'signedLink' ? `?signature=<SIGNATURE>&expiresAt=<EXPIRES_AT>${ep.scope ? `&scope=${ep.scope}` : ''}` : '';
  const headers = ep.auth === 'apiKey'
    ? ["-H 'x-api-key: <KEY_ID>'", "-H 'x-api-secret: <KEY_SECRET>'"]
    : [];
  const body = ep.exampleBody ? JSON.stringify(ep.exampleBody, null, 2) : null;
  const curl = [`curl -X ${ep.method} '${url}${qs}'`, ...headers, ...(body ? ["-H 'Content-Type: application/json'", `-d '${JSON.stringify(ep.exampleBody)}'`] : [])].join(' \\\n  ');
  const jsHeaders = [
    ...(ep.auth === 'apiKey' ? ["'x-api-key': process.env.API_KEY_ID", "'x-api-secret': process.env.API_KEY_SECRET"] : []),
    ...(body ? ["'Content-Type': 'application/json'"] : []),
  ];
  const js = `const res = await fetch('${url}${qs}', {\n  method: '${ep.method}',${jsHeaders.length ? `\n  headers: {\n    ${jsHeaders.join(',\n    ')},\n  },` : ''}${body ? `\n  body: JSON.stringify(${body.replace(/\n/g, '\n  ')}),` : ''}\n});\nconst json = await res.json();\nif (!json.success) throw new Error(json.message);`;
  return { curl, js };
};

const EndpointCard = ({ ep }: { ep: EndpointDoc }) => {
  const [tab, setTab] = useState<'curl' | 'js'>('curl');
  const { curl, js } = useMemo(() => samples(ep), [ep]);
  return (
    <article id={ep.id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-md border px-2 py-0.5 font-mono text-xs font-semibold', METHOD_STYLES[ep.method])}>{ep.method}</span>
        <code className="break-all font-mono text-sm text-white">{ep.path}</code>
        <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
          ep.auth === 'apiKey' ? 'bg-amber-500/10 text-amber-200' : 'bg-violet-500/10 text-violet-200')}>
          {ep.auth === 'apiKey' ? <KeyRound className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
          {ep.auth === 'apiKey' ? 'API key (server-side)' : `Signed link${ep.scope ? ` · ${ep.scope}` : ''}`}
        </span>
      </header>
      <h3 className="mt-3 text-base font-semibold text-white">{ep.title}</h3>
      <p className="mt-1 text-sm text-slate-300">{ep.description}</p>
      {ep.notes?.map((n) => <p key={n} className="mt-1 text-xs text-amber-200/80">{n}</p>)}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {ep.query && <FieldTable title="Query parameters" fields={ep.query} />}
          {ep.body && <FieldTable title="JSON body" fields={ep.body} />}
          {!ep.query && !ep.body && <p className="text-sm text-slate-500">No parameters.</p>}
        </div>
        <div className="min-w-0 space-y-3">
          <div role="tablist" aria-label="Code sample language" className="flex gap-1">
            {(['curl', 'js'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={cn('rounded-lg px-3 py-1 text-xs font-medium', tab === t ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5')}>
                {t === 'curl' ? 'cURL' : 'JavaScript'}
              </button>
            ))}
          </div>
          <CodeBlock code={tab === 'curl' ? curl : js} label={tab === 'curl' ? 'cURL' : 'JavaScript (Node 18+)'} />
          <CodeBlock code={JSON.stringify(ep.exampleResponse, null, 2)} label="Example response" />
        </div>
      </div>
    </article>
  );
};

const ServiceSection = ({ service }: { service: ServiceDoc }) => (
  <section id={service.id} className="scroll-mt-24 space-y-4" aria-labelledby={`${service.id}-title`}>
    <div>
      <h2 id={`${service.id}-title`} className="text-lg font-semibold text-white">{service.name}</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-400">{service.summary}</p>
      <p className="mt-1 text-xs text-slate-500">API key category: <code className="text-slate-300">{service.apiKeyCategory}</code> · Service must be enabled on your account.</p>
    </div>
    {service.endpoints.map((ep) => <EndpointCard key={ep.id} ep={ep} />)}
  </section>
);

/**
 * Developer documentation for the public API. Content comes from
 * `apiCatalog.ts`; legacy routes (/api-docs/chat …) scroll to their section.
 */
export const ApiDocsPage = () => {
  const { section } = useParams();
  const role = useAuthStore((s) => s.user?.role);
  const prefix = dashboardPrefix(role);

  useEffect(() => {
    if (!section) return;
    const id = section === 'code-share-v2' ? 'code-share-v2' : section;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [section]);

  return (
    <DashboardPage title="API" accent="Reference" icon={<BookOpen size={20} />} subtitle="Integrate platform services into your own apps. Call key-authenticated endpoints from your server; give end users signed links.">
      <SEO title="API reference" description="Public API reference" />
      <div className="space-y-8">
        <nav aria-label="API sections" className="flex flex-wrap gap-2">
          {[{ id: 'overview', name: 'Overview' }, ...API_SERVICES, { id: 'errors', name: 'Errors' }].map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10">{s.name}</a>
          ))}
        </nav>

        <section id="overview" className="scroll-mt-24 grid gap-4 lg:grid-cols-2">
          <Panel title="Base URL">
            <CodeBlock code={BASE_URL} label="All paths below are relative to" />
          </Panel>
          <Panel title="Authentication">
            <p className="text-sm text-slate-300">
              Create a key per service on the <Link className="text-sky-300 underline" to={`${prefix}/api-keys`}>API Keys</Link> page. Send it in headers from your <strong>server only</strong> — never in the URL, request body, or browser code.
            </p>
            <div className="mt-3"><CodeBlock code={'x-api-key: <KEY_ID>\nx-api-secret: <KEY_SECRET>'} label="Headers" /></div>
          </Panel>
          <Panel title="Signed links">
            <p className="text-sm text-slate-300">
              Key-authenticated calls return a <code>signedUrl</code> you can embed (iframe or link) for your end user. Links expire (max 7 days) and carry a scope:
              <strong> read</strong> links can only view; <strong>write</strong> links can also edit. The scope is part of the signature, so a read link can’t be upgraded.
            </p>
          </Panel>
          <Panel title="Responses & billing">
            <p className="text-sm text-slate-300">Every response is JSON with <code>success</code>. Usage is metered per service and charged to the key owner’s wallet (prepaid) or invoice (postpaid) at your account’s price.</p>
            <div className="mt-3"><CodeBlock code={JSON.stringify({ success: false, code: 'INSUFFICIENT_FUNDS', message: 'Insufficient wallet balance', details: {} }, null, 2)} label="Error shape" /></div>
          </Panel>
        </section>

        {API_SERVICES.map((s) => <ServiceSection key={s.id} service={s} />)}

        <section id="errors" className="scroll-mt-24">
          <Panel title="Errors">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs text-slate-400"><tr><th className="py-2">Status</th><th>Code</th><th>Meaning</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {ERROR_CODES.map((e) => (
                    <tr key={e.status}><td className="py-2 font-mono text-white">{e.status}</td><td className="font-mono text-xs text-sky-300">{e.code}</td><td className="text-slate-300">{e.meaning}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-400"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden /> If a key secret is exposed, revoke the key on the API Keys page immediately and create a new one.</p>
          </Panel>
        </section>
      </div>
    </DashboardPage>
  );
};
