import { http } from './http.js';
import type {
  ConfirmPaymentResponse,
  PaymentIntentResponse,
  PaymentMethodInput,
  PaymentStatusResponse,
} from '../../types/api.js';

export const paymentsApi = {
  createIntent: (amount: number, currency: string, reservationIds: string[]) =>
    http.post<PaymentIntentResponse>('/payment/create-intent', {
      amount,
      currency,
      reservationIds,
    }),

  confirm: (paymentIntentId: string, paymentMethod: PaymentMethodInput) =>
    http.post<ConfirmPaymentResponse>('/payment/confirm', {
      paymentIntentId,
      paymentMethod,
    }),

  getStatus: (paymentIntentId: string) =>
    http.get<PaymentStatusResponse>(`/payment/status/${paymentIntentId}`),
};
