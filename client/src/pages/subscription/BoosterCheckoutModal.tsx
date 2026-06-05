import { usePaymentFlow } from '../../hooks/usePaymentFlow.js';
import { usePaymentMethodForm } from '../../hooks/usePaymentMethodForm.js';
import { PaymentShell } from './PaymentShell.js';

export interface BoosterProduct {
  id: string;
  name: string;
  tokenType: 'chat' | 'nexus';
  amount: number;
  price: number;
}

export const BoosterCheckoutModal = ({ booster, onClose, onSuccess }: {
  booster:   BoosterProduct;
  onClose:   () => void;
  onSuccess: () => void;
}) => {
  const form = usePaymentMethodForm();
  const { paymentStep, errorMessage, startPayment, reset } = usePaymentFlow({
    createIntent: async () => {
      const { paymentsApi } = await import('../../services/api/index.js');
      const res = await paymentsApi.createPaymentIntent({
        amount:   booster.price * 100,
        currency: 'INR',
        kind:     'subscription',
        metadata: { kind: 'booster', productId: booster.id },
      });
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

  return (
    <PaymentShell
      heading={booster.name}
      subheading={`+${booster.amount.toLocaleString()} ${booster.tokenType === 'chat' ? 'Chat Sparks' : 'Nexus Credits'}`}
      priceDisplay={booster.price}
      accent="blue"
      form={form}
      paymentStep={paymentStep}
      errorMessage={errorMessage}
      startPayment={startPayment}
      reset={reset}
      successMessage="Tokens added to your account!"
      onClose={onClose}
    />
  );
};
