import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { ModalShell } from './ModalShell.js';
import { subscriptionApi } from '../../services/api/index.js';

export const EnterpriseForm = ({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [sparksLimit, setSparksLimit]       = useState(1_000_000);
  const [durationMonths, setDurationMonths] = useState(6);
  const [sla, setSla]                       = useState<'standard' | 'priority' | 'dedicated'>('standard');
  const [features, setFeatures]             = useState({ customModels: false, dedicatedInfra: false, slaGuarantee: false });
  const [quote, setQuote]  = useState<{ priceDisplay: number; discountPct: number } | null>(null);
  const [error, setError]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userNote, setUserNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    subscriptionApi.enterpriseQuote(sparksLimit, durationMonths)
      .then((res) => {
        if (cancelled) return;
        setQuote({ priceDisplay: res.priceDisplay, discountPct: res.discountPct });
      })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [sparksLimit, durationMonths]);

  const toggleFeature = (k: keyof typeof features) =>
    setFeatures((f) => ({ ...f, [k]: !f[k] }));

  const submit = async () => {
    if (!quote) { setError('Waiting for price quote…'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await subscriptionApi.requestEnterpriseQuote({
        monthlyLimit: sparksLimit,
        durationMonths,
        priceDisplay: quote.priceDisplay,
        userNote: userNote.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtK = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M` : `${(n / 1_000).toFixed(0)}K`;

  return (
    <ModalShell onClose={onClose} heading="Enterprise" subheading="Custom terms" accent="emerald">
      <div className="mt-5 space-y-4">
        {/* Chat Sparks slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Monthly Chat Sparks</span>
            <span className="text-[12px] font-black text-emerald-300 tabular-nums">{fmtK(sparksLimit)}</span>
          </div>
          <input
            type="range" min={100_000} max={5_000_000} step={100_000}
            value={sparksLimit}
            onChange={(e) => setSparksLimit(Number(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
            <span>100K</span><span>5M</span>
          </div>
        </div>

        {/* Duration slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Contract Duration</span>
            <span className="text-[12px] font-black text-emerald-300 tabular-nums">{durationMonths} month{durationMonths !== 1 ? 's' : ''}</span>
          </div>
          <input
            type="range" min={1} max={12} step={1}
            value={durationMonths}
            onChange={(e) => setDurationMonths(Number(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
            <span>1 mo</span><span>12 mo</span>
          </div>
        </div>

        {/* Support SLA */}
        <div>
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Support SLA</span>
          <select
            value={sla}
            onChange={(e) => setSla(e.target.value as typeof sla)}
            className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-emerald-400/40"
          >
            <option value="standard">Standard (48h response)</option>
            <option value="priority">Priority (24h response)</option>
            <option value="dedicated">Dedicated Account Manager</option>
          </select>
        </div>

        {/* Add-on features */}
        <div>
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Add-ons</span>
          <div className="mt-2 space-y-2">
            {([
              { key: 'customModels',   label: 'Custom model configuration' },
              { key: 'dedicatedInfra', label: 'Dedicated infrastructure' },
              { key: 'slaGuarantee',  label: 'SLA uptime guarantee (99.9%)' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={features[key]}
                  onChange={() => toggleFeature(key)}
                  className="accent-emerald-400 w-4 h-4 rounded"
                />
                <span className="text-[12px] text-white/70 font-bold">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
              Additional Note (Optional)
            </span>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              rows={3}
              placeholder="e.g. We need SSO integration and priority support."
              className="w-full mt-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
            />
          </label>
        </div>

        {/* Quote */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Estimated Total</div>
          {quote ? (
            <>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">₹{quote.priceDisplay.toLocaleString('en-IN')}</span>
                {quote.discountPct > 0 && (
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">{quote.discountPct}% off</span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-white/40">
                ₹0.0007 per token/month · {durationMonths}-month contract
                {quote.discountPct > 0 ? ` · ${quote.discountPct}% volume discount` : ''}
              </p>
            </>
          ) : (
            <div className="mt-1 text-[11px] font-bold text-white/30">Calculating…</div>
          )}
        </div>

        {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}

        {success ? (
          <div className="mt-4 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/25 flex flex-col items-center">
            <CheckCircle2 size={24} className="text-emerald-400 mb-2" />
            <p className="text-[12px] font-bold text-emerald-300 text-center">Request submitted successfully! Our team will review it shortly.</p>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={!quote || submitting}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Request'}
          </button>
        )}
      </div>
    </ModalShell>
  );
};
