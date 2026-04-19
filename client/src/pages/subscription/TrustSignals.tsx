import { Lock, RefreshCw, Mail } from 'lucide-react';

/**
 * Three-column trust row that sits above the existing "Discounts apply at
 * checkout" footnote. Intentionally faint (`text-white/30`) — it's
 * reassurance, not headline content.
 */
export const TrustSignals = () => (
  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-[10px] text-white/30 max-w-3xl mx-auto">
    <div className="flex items-center justify-center gap-2">
      <Lock size={12} className="text-white/40 shrink-0" />
      <span>Secure checkout</span>
    </div>
    <div className="flex items-center justify-center gap-2">
      <RefreshCw size={12} className="text-white/40 shrink-0" />
      <span>Cancel anytime — no commitment</span>
    </div>
    <div className="flex items-center justify-center gap-2">
      <Mail size={12} className="text-white/40 shrink-0" />
      <span>support@moveai.com</span>
    </div>
  </div>
);
