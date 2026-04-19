import { useCallback, useState } from 'react';
import { paymentsApi, ApiError } from '../services/api/index.js';
import type { PaymentMethodInput } from '../types/api.js';

export type PaymentStep = 'review' | 'processing' | 'success' | 'error';

/** Minimal shape the hook needs from a `createIntent` callback. */
export interface CreatedIntent {
  paymentIntentId: string;
  clientSecret:    string;
  amount:          number;
  currency:        string;
}

/** Minimal shape the hook needs from a `confirm` callback. */
export interface ConfirmedPayment {
  status:        string;
  transactionId: string;
}

export interface UsePaymentFlow {
  paymentStep:  PaymentStep;
  errorMessage: string;
  startPayment: (method: PaymentMethodInput) => Promise<void>;
  reset:        () => void;
}

export interface UsePaymentFlowOptions {
  /** Create the payment intent on the server. */
  createIntent: () => Promise<CreatedIntent>;
  /** Confirm the intent with the chosen payment method. */
  confirm:      (paymentIntentId: string, method: PaymentMethodInput) => Promise<ConfirmedPayment>;
  /** Called once on success with the server-issued transaction id. */
  onSuccess:    (transactionId: string) => void;
}

export function usePaymentFlow({ createIntent, confirm, onSuccess }: UsePaymentFlowOptions): UsePaymentFlow {
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('review');
  const [errorMessage, setErrorMessage] = useState('');

  const startPayment = useCallback(
    async (method: PaymentMethodInput) => {
      setPaymentStep('processing');
      setErrorMessage('');

      try {
        const intent    = await createIntent();
        const confirmed = await confirm(intent.paymentIntentId, method);

        if (confirmed.status === 'succeeded') {
          setPaymentStep('success');
          onSuccess(confirmed.transactionId);
          return;
        }

        setPaymentStep('error');
        setErrorMessage('Payment could not be confirmed. Please try again.');
      } catch (err) {
        setPaymentStep('error');
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : 'Payment failed. Please try again.',
        );
      }
    },
    [createIntent, confirm, onSuccess],
  );

  const reset = useCallback(() => {
    setPaymentStep('review');
    setErrorMessage('');
  }, []);

  return { paymentStep, errorMessage, startPayment, reset };
}

/**
 * Backwards-compatible seat-flavored helper — mirrors the old hook signature.
 * Existing call sites (Checkout.tsx) keep working unchanged.
 */
export function useSeatPaymentFlow(options: {
  amount:         number;
  currency:       string;
  reservationIds: string[];
  onSuccess:      (transactionId: string) => void;
}): UsePaymentFlow {
  const { amount, currency, reservationIds, onSuccess } = options;
  return usePaymentFlow({
    createIntent: () => paymentsApi.createIntent(amount, currency, reservationIds),
    confirm:      (id, method) => paymentsApi.confirm(id, method),
    onSuccess,
  });
}
