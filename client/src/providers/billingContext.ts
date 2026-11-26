import { createContext, useContext } from 'react';
import type { BillingAccountSummary } from '../types/platform.js';

/**
 * Billing state shared by the app shell (balance pill) and metered features
 * (chat). Signed-link guests never see the owner's balance — only whether
 * sending is currently possible.
 */
export interface BillingState {
  account: BillingAccountSummary | null;
  loading: boolean;
  isGuest: boolean;
  /** Guests: whether the conversation owner can currently be billed. */
  canSend: boolean;
  refresh: () => Promise<void>;
  /** Apply the balance returned by a metered request without refetching. */
  applyCharge: (billing: { balance: number | null } | null | undefined) => void;
}

export const BillingContext = createContext<BillingState | null>(null);

export const useBilling = (): BillingState => {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used inside <BillingProvider>');
  return ctx;
};
