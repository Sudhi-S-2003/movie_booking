
import { useCallback, useState } from 'react';
import { paymentsApi, ApiError } from '../services/api/index.js';
import type { PaymentMethodInput } from '../types/api.js';

export type PaymentStep = 'review' | 'processing' | 'success' | 'error';

export interface StartPaymentArgs {
  amount: number;
  currency: string;
  reservationIds: string[];
  method: PaymentMethodInput;
}

export interface UsePaymentFlow {
  paymentStep: PaymentStep;
  errorMessage: string;
  startPayment: (args: StartPaymentArgs) => Promise<void>;
  reset: () => void;
}

export interface UsePaymentFlowOptions {
  onSuccess: (transactionId: string) => void;
}

export function usePaymentFlow({ onSuccess }: UsePaymentFlowOptions): UsePaymentFlow {
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('review');
  const [errorMessage, setErrorMessage] = useState('');

  const startPayment = useCallback(
    async ({ amount, currency, reservationIds, method }: StartPaymentArgs) => {
      setPaymentStep('processing');
      setErrorMessage('');

      try {
        const intent = await paymentsApi.createIntent(amount, currency, reservationIds);
        const confirm = await paymentsApi.confirm(intent.paymentIntentId, method);

        if (confirm.status === 'succeeded') {
          setPaymentStep('success');
          onSuccess(confirm.transactionId);
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
    [onSuccess],
  );

  const reset = useCallback(() => {
    setPaymentStep('review');
    setErrorMessage('');
  }, []);

  return { paymentStep, errorMessage, startPayment, reset };
}
