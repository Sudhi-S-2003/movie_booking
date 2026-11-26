import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { errorMessage } from './format.js';
import { cn } from '../../utils/cn.js';

export const Panel = ({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn('rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6', className)}>
    {(title || actions) && (
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {title && <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">{title}</h2>}
        {actions}
      </header>
    )}
    {children}
  </section>
);

export const StatCard = ({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={cn('mt-2 text-xl font-bold tabular-nums', {
      'text-white': tone === 'default', 'text-emerald-300': tone === 'good', 'text-amber-300': tone === 'warn', 'text-rose-300': tone === 'bad',
    })}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

const BADGE_TONES: Record<string, string> = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  settled: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  suspended: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  frozen: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  unbilled: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  invoiced: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  issued: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  beta: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  closed: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  disabled: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export const Badge = ({ value, label }: { value: string; label?: string }) => (
  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
    BADGE_TONES[value] ?? 'border-white/15 bg-white/5 text-slate-300')}>
    {label ?? value.replace(/_/g, ' ')}
  </span>
);

export const Button = ({ variant = 'primary', loading, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean }) => (
  <button
    type="button"
    {...rest}
    disabled={disabled || loading}
    className={cn('inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-50', {
      'bg-sky-500 text-slate-950 hover:bg-sky-400': variant === 'primary',
      'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10': variant === 'secondary',
      'bg-rose-500/90 text-white hover:bg-rose-500': variant === 'danger',
      'text-slate-300 hover:bg-white/5': variant === 'ghost',
    }, className)}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    {children}
  </button>
);

const fieldBase = 'w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none';

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
    {children}
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </label>
);

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => <input {...rest} className={cn(fieldBase, className)} />;
export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...rest} className={cn(fieldBase, className)}>{children}</select>
);

/** Uniform loading / error / empty handling for query-driven sections. */
export const QueryState = ({ isLoading, error, isEmpty, emptyText = 'Nothing here yet', onRetry, children }: {
  isLoading: boolean; error: unknown; isEmpty?: boolean; emptyText?: string; onRetry?: () => void; children: ReactNode;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-400" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
        <AlertTriangle className="h-6 w-6 text-rose-400" aria-hidden />
        <p className="text-sm text-rose-200">{errorMessage(error)}</p>
        {onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500">
        <Inbox className="h-6 w-6" aria-hidden />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
};

export const Pager = ({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) =>
  totalPages <= 1 ? null : (
    <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-400">
      <Button variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</Button>
      <span className="tabular-nums">{page} / {totalPages}</span>
      <Button variant="ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );

