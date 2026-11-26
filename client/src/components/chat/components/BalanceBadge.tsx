import { Link } from 'react-router-dom';
import { Wallet, AlertTriangle, Infinity as InfinityIcon } from 'lucide-react';
import { useBilling } from '../../../providers/billingContext.js';
import { formatMoney } from '../../../utils/money.js';

/**
 * Compact billing indicator for metered screens. Members see their wallet
 * balance (prepaid) or open charges (postpaid); signed-link guests only see
 * a warning when the owner can't currently be billed.
 */
export const BalanceBadge = () => {
  const { account, isGuest, canSend } = useBilling();

  if (isGuest) {
    if (canSend) return null;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Messaging paused
      </span>
    );
  }
  if (!account) return null;

  const label = account.isUnlimited
    ? 'Unlimited'
    : account.mode === 'prepaid'
      ? formatMoney(account.balance)
      : `${formatMoney(account.unbilled + account.outstanding)} due`;
  const low = !account.isUnlimited && account.mode === 'prepaid' && account.balance <= 0;

  return (
    <Link
      to="/billing"
      title="Wallet & billing"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        low ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
      }`}
    >
      {account.isUnlimited ? <InfinityIcon className="h-3.5 w-3.5" aria-hidden /> : <Wallet className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </Link>
  );
};
