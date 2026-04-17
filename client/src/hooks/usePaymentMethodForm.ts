
import { useMemo, useState } from 'react';
import type { PaymentMethodInput } from '../types/api.js';

export type PaymentMethodType = 'card' | 'upi' | 'netbanking';

const formatCardNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export interface UsePaymentMethodForm {
  method: PaymentMethodType;
  setMethod: (m: PaymentMethodType) => void;

  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardName: string;
  setCardNumber: (v: string) => void;
  setCardExpiry: (v: string) => void;
  setCardCvc: (v: string) => void;
  setCardName: (v: string) => void;

  upiId: string;
  setUpiId: (v: string) => void;

  isValid: boolean;
  buildPaymentMethod: () => PaymentMethodInput;
}

export function usePaymentMethodForm(): UsePaymentMethodForm {
  const [method, setMethod] = useState<PaymentMethodType>('card');

  const [cardNumberRaw, setCardNumberRaw] = useState('');
  const [cardExpiryRaw, setCardExpiryRaw] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  const [upiId, setUpiId] = useState('');

  const isCardValid =
    cardNumberRaw.replace(/\s/g, '').length === 16 &&
    cardExpiryRaw.length === 5 &&
    cardCvc.length >= 3 &&
    cardName.length > 0;
  const isUpiValid = upiId.includes('@') && upiId.length > 3;

  const isValid = useMemo(() => {
    if (method === 'card') return isCardValid;
    if (method === 'upi') return isUpiValid;
    return true;
  }, [method, isCardValid, isUpiValid]);

  const buildPaymentMethod = (): PaymentMethodInput => {
    if (method === 'card') {
      const [expMonth, expYear] = cardExpiryRaw.split('/');
      return {
        type: 'card',
        card: {
          number: cardNumberRaw.replace(/\s/g, ''),
          expMonth: parseInt(expMonth ?? '0', 10),
          expYear: parseInt('20' + (expYear ?? ''), 10),
          cvc: cardCvc,
        },
      };
    }
    if (method === 'upi') {
      return { type: 'upi', upiId };
    }
    return { type: 'netbanking', bank: 'HDFC' };
  };

  return {
    method,
    setMethod,
    cardNumber: cardNumberRaw,
    cardExpiry: cardExpiryRaw,
    cardCvc,
    cardName,
    setCardNumber: (v) => setCardNumberRaw(formatCardNumber(v)),
    setCardExpiry: (v) => setCardExpiryRaw(formatExpiry(v)),
    setCardCvc: (v) => setCardCvc(v.replace(/\D/g, '').slice(0, 4)),
    setCardName,
    upiId,
    setUpiId,
    isValid,
    buildPaymentMethod,
  };
}
