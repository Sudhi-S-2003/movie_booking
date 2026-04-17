
export interface CheckoutTotals {
  subtotal: number;
  convenienceFee: number;
  gst: number;
  total: number;
}

export const CONVENIENCE_FEE_RATE = 0.05;
export const GST_RATE = 0.18;

export const computeCheckoutTotals = (ticketPrices: number[]): CheckoutTotals => {
  const subtotal = ticketPrices.reduce((sum, p) => sum + p, 0);
  const convenienceFee = Math.round(subtotal * CONVENIENCE_FEE_RATE);
  const gst = Math.round(convenienceFee * GST_RATE);
  return {
    subtotal,
    convenienceFee,
    gst,
    total: subtotal + convenienceFee + gst,
  };
};
