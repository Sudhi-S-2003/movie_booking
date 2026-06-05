import { subscriptionApi, type BillingCycle, type PaidPlan } from '../../services/api/index.js';
import type { OfferType } from '../../services/api/subscription.api.js';
import { usePaymentFlow } from '../../hooks/usePaymentFlow.js';
import { usePaymentMethodForm } from '../../hooks/usePaymentMethodForm.js';
import { PaymentShell } from './PaymentShell.js';

export interface CheckoutModalProps {
  plan:         PaidPlan;
  cycle:        BillingCycle;
  priceDisplay: number;
  basePrice:    number;
  offerType:    OfferType;
  discountPct:  number;
  onClose:      () => void;
  onSuccess:    () => void;
}

export const CheckoutModal = ({
  plan, cycle, priceDisplay, basePrice, offerType, discountPct, onClose, onSuccess,
}: CheckoutModalProps) => {
  const form = usePaymentMethodForm();
  const { paymentStep, errorMessage, startPayment, reset } = usePaymentFlow({
    createIntent: async () => {
      const res = await subscriptionApi.checkout(plan, cycle);
      return {
        paymentIntentId: res.paymentIntentId,
        clientSecret:    res.clientSecret,
        amount:          res.amount,
        currency:        res.currency,
      };
    },
    confirm: async (paymentIntentId, method) => {
      const { paymentsApi } = await import('../../services/api/index.js');
      return paymentsApi.confirm(paymentIntentId, method);
    },
    onSuccess: () => { setTimeout(onSuccess, 1200); },
  });

  const heading = plan === 'proMax' ? 'Upgrade to Pro Max' : 'Upgrade to Pro';

  return (
    <PaymentShell
      heading={heading}
      subheading={cycle === 'monthly' ? 'Monthly cycle' : 'Quarterly cycle — 10% off'}
      priceDisplay={priceDisplay}
      basePrice={basePrice}
      offerType={offerType}
      discountPct={discountPct}
      accent={plan === 'proMax' ? 'pink' : 'blue'}
      form={form}
      paymentStep={paymentStep}
      errorMessage={errorMessage}
      startPayment={startPayment}
      reset={reset}
      successMessage={`You're on ${plan === 'proMax' ? 'Pro Max' : 'Pro'}`}
      onClose={onClose}
    />
  );
};
