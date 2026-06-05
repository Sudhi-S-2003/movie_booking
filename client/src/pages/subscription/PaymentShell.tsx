import { CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { ModalShell } from './ModalShell.js';
import type { OfferType } from '../../services/api/subscription.api.js';
import type { PaymentStep } from '../../hooks/usePaymentFlow.js';
import type { UsePaymentMethodForm } from '../../hooks/usePaymentMethodForm.js';
import type { PaymentMethodInput } from '../../types/api.js';

export interface PaymentShellProps {
  heading:         string;
  subheading:      string;
  priceDisplay:    number;
  basePrice?:      number;
  offerType?:      OfferType;
  discountPct?:    number;
  accent:          'pink' | 'emerald' | 'blue';
  form:            UsePaymentMethodForm;
  paymentStep:     PaymentStep;
  errorMessage:    string;
  startPayment:    (method: PaymentMethodInput) => Promise<void>;
  reset:           () => void;
  successMessage:  string;
  onClose:         () => void;
}

export const PaymentShell = ({
  heading, subheading, priceDisplay, basePrice, offerType, discountPct, accent, form,
  paymentStep, errorMessage, startPayment, reset, successMessage, onClose,
}: PaymentShellProps) => {
  const hasOffer = !!offerType && offerType !== 'none' && !!basePrice && basePrice > priceDisplay;
  const savings  = hasOffer && basePrice ? basePrice - priceDisplay : 0;
  const canPay = form.isValid && paymentStep === 'review';
  return (
    <ModalShell onClose={onClose} heading={heading} subheading={subheading} accent={accent}>
      <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex justify-between items-end">
        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Total</span>
        <span className="text-right">
          <span className="block text-2xl font-black text-white tabular-nums">₹{priceDisplay.toLocaleString('en-IN')}</span>
          {hasOffer && (
            <span className="block mt-0.5 text-[10px] font-bold text-white/30 line-through tabular-nums">
              ₹{basePrice!.toLocaleString('en-IN')}
            </span>
          )}
        </span>
      </div>
      {hasOffer && (
        <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/25 rounded-xl px-3 py-2">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>
            Offer applied
            {discountPct ? ` (${discountPct}% off)` : ''}
            {' '}— you save ₹{savings.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {paymentStep === 'review' && (
        <div className="mt-5 space-y-3">
          <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1">
            {(['card', 'upi', 'netbanking'] as const).map((m) => (
              <button key={m} onClick={() => form.setMethod(m)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  form.method === m ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >{m}</button>
            ))}
          </div>

          {form.method === 'card' && (
            <div className="space-y-2">
              <input value={form.cardName}   onChange={(e) => form.setCardName(e.target.value)}   placeholder="Cardholder Name" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
              <input value={form.cardNumber} onChange={(e) => form.setCardNumber(e.target.value)} placeholder="Card Number" maxLength={19} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.cardExpiry} onChange={(e) => form.setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
                <input value={form.cardCvc}    onChange={(e) => form.setCardCvc(e.target.value)}    placeholder="CVC" maxLength={4} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
              </div>
              <p className="text-[9px] text-white/30 font-bold">Use 4242 4242 4242 4242 · any future expiry · any CVC</p>
            </div>
          )}

          {form.method === 'upi' && (
            <input value={form.upiId} onChange={(e) => form.setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-accent-blue/40" />
          )}

          {form.method === 'netbanking' && (
            <p className="text-[10px] text-white/40 font-bold">Net banking is simulated. Click Pay to continue.</p>
          )}

          <button
            disabled={!canPay}
            onClick={() => void startPayment(form.buildPaymentMethod())}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              canPay ? 'bg-accent-pink text-white hover:bg-accent-pink/90' : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            <Lock size={12} />
            Pay ₹{priceDisplay.toLocaleString('en-IN')}
          </button>
        </div>
      )}

      {paymentStep === 'processing' && (
        <div className="mt-6 flex flex-col items-center py-6">
          <Loader2 size={24} className="animate-spin text-accent-blue mb-3" />
          <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">Loading…</p>
        </div>
      )}

      {paymentStep === 'success' && (
        <div className="mt-6 flex flex-col items-center py-6">
          <CheckCircle2 size={28} className="text-emerald-400 mb-3" />
          <p className="text-[13px] font-black text-white">{successMessage}</p>
        </div>
      )}

      {paymentStep === 'error' && (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <AlertCircle size={24} className="text-red-400 mb-3" />
          <p className="text-[11px] font-bold text-red-400 mb-3">{errorMessage}</p>
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </ModalShell>
  );
};
