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

  createPaymentIntent: (args: { amount: number; currency: string; kind?: string; metadata?: Record<string, unknown>; reservationIds?: string[] }) =>
    http.post<PaymentIntentResponse>('/payment/create-intent', args),

  confirm: (paymentIntentId: string, paymentMethod: PaymentMethodInput) =>
    http.post<ConfirmPaymentResponse>('/payment/confirm', {
      paymentIntentId,
      paymentMethod,
    }),

  getStatus: (paymentIntentId: string) =>
    http.get<PaymentStatusResponse>(`/payment/status/${paymentIntentId}`),
};
