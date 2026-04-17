import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ShieldCheck, Ticket, ChevronLeft, Lock, CheckCircle2, Loader2, AlertCircle, Smartphone, Banknote } from 'lucide-react';
import { useBookingStore } from '../store/bookingStore.js';
import { useBookingSession } from '../providers/BookingSessionProvider.js';
import { bookingsApi } from '../services/api/index.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { usePaymentFlow } from '../hooks/usePaymentFlow.js';
import { usePaymentMethodForm } from '../hooks/usePaymentMethodForm.js';
import { computeCheckoutTotals } from '../utils/checkoutTotals.js';

export const Checkout = () => {
  useDocumentTitle("Checkout");
  const navigate = useNavigate();
  const { selectedSeats, currentShowtimeId, activeReservationIds, clearSelection } = useBookingStore();
  const { showtime, setShowtime } = useBookingSession();

  const form = usePaymentMethodForm();

  const { subtotal: totalPrice, convenienceFee, gst, total: finalTotal } =
    computeCheckoutTotals(selectedSeats.map((s) => s.price));

  const { paymentStep, errorMessage, startPayment, reset } = usePaymentFlow({
    onSuccess: (transactionId) => {
      setTimeout(() => {
        clearSelection();
        navigate('/success', {
          state: {
            movie: showtime.movieId.title,
            theatre: showtime.theatreId.name,
            seats: selectedSeats.map((s) => s.id),
            total: finalTotal,
            transactionId,
          },
        });
      }, 1800);
    },
  });

  useEffect(() => {
    if (paymentStep !== 'review') return;
    if (!currentShowtimeId || selectedSeats.length === 0) {
      navigate('/');
      return;
    }

    if (!showtime) {
      bookingsApi.getShowtimeDetails(currentShowtimeId).then((res) => {
        setShowtime(res.showtime);
      });
    }
  }, [currentShowtimeId, selectedSeats, navigate, paymentStep, showtime, setShowtime]);

  const canPay = form.isValid;

  const handlePayment = () => {
    if (!canPay) return;
    void startPayment({
      amount: finalTotal,
      currency: 'INR',
      reservationIds: activeReservationIds,
      method: form.buildPaymentMethod(),
    });
  };

  const selectedMethod = form.method;
  const setSelectedMethod = form.setMethod;
  const { cardNumber, cardExpiry, cardCvc, cardName, upiId } = form;
  const setCardNumber = form.setCardNumber;
  const setCardExpiry = form.setCardExpiry;
  const setCardCvc = form.setCardCvc;
  const setCardName = form.setCardName;
  const setUpiId = form.setUpiId;

  if (!showtime) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="animate-spin text-accent-pink" />
        <span className="font-black text-white uppercase tracking-widest text-sm">Preparing Checkout...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] py-8 px-4">
      <div className="max-w-5xl mx-auto">

        {}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Checkout</h1>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Secure Payment Gateway</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Lock size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">SSL Encrypted</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {}
          <div className="lg:col-span-5 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-6"
            >
              {}
              <div className="flex gap-4">
                <div className="w-20 aspect-[2/3] rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-white/5">
                  <img src={showtime.movieId.posterUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h2 className="text-lg font-black text-white leading-tight truncate">{showtime.movieId.title}</h2>
                  <p className="text-[11px] font-bold text-accent-blue uppercase tracking-wider truncate">{showtime.theatreId.name} · {showtime.screenId.name}</p>
                  <p className="text-[11px] font-bold text-gray-500">
                    {new Date(showtime.startTime).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Ticket size={12} className="text-accent-pink" />
                    <span className="text-[10px] font-black text-accent-pink uppercase tracking-wider">
                      {selectedSeats.length} {selectedSeats.length === 1 ? 'Ticket' : 'Tickets'}
                    </span>
                  </div>
                </div>
              </div>

              {}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Selected Seats</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeats.map(s => (
                    <span key={s.id} className="px-2.5 py-1 bg-accent-pink/10 border border-accent-pink/20 rounded-lg text-[10px] font-black text-accent-pink">
                      {s.id}
                    </span>
                  ))}
                </div>
              </div>

              {}
              <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Ticket Price</span>
                  <span className="text-white font-bold">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Convenience Fee</span>
                  <span className="text-white font-bold">₹{convenienceFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">GST (18%)</span>
                  <span className="text-white font-bold">₹{gst}</span>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-white/[0.06]">
                  <span className="text-sm font-black text-white uppercase tracking-tight">Total</span>
                  <span className="text-2xl font-black text-white">₹{finalTotal}</span>
                </div>
              </div>
            </motion.div>

            <div className="flex items-center gap-3 p-4 bg-accent-blue/5 border border-accent-blue/10 rounded-xl">
              <ShieldCheck size={18} className="text-accent-blue flex-shrink-0" />
              <p className="text-[10px] font-bold text-accent-blue/80 leading-relaxed">Your payment is secured with 256-bit SSL encryption. We never store your card details.</p>
            </div>
          </div>

          {}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {paymentStep === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-5"
                >
                  {}
                  <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1.5">
                    {([
                      { key: 'card' as const, icon: CreditCard, label: 'Credit/Debit Card' },
                      { key: 'upi' as const, icon: Smartphone, label: 'UPI' },
                      { key: 'netbanking' as const, icon: Banknote, label: 'Net Banking' },
                    ]).map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setSelectedMethod(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          selectedMethod === key
                            ? 'bg-white/10 text-white border border-white/10'
                            : 'text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>

                  {}
                  {selectedMethod === 'card' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5"
                    >
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={e => setCardName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/40 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={e => setCardNumber(e.target.value)}
                            placeholder="4242 4242 4242 4242"
                            maxLength={19}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/40 transition-colors tracking-wider"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            <div className="px-1.5 py-0.5 bg-white/10 rounded text-[7px] font-black text-gray-400 italic">VISA</div>
                            <div className="px-1.5 py-0.5 bg-white/10 rounded text-[7px] font-black text-gray-400">MC</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Expiry</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/40 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">CVC</label>
                          <input
                            type="text"
                            value={cardCvc}
                            onChange={e => setCardCvc(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/40 transition-colors"
                          />
                        </div>
                      </div>

                      <p className="text-[9px] text-gray-700 font-bold">Use test card: 4242 4242 4242 4242, any future expiry, any 3-digit CVC</p>
                    </motion.div>
                  )}

                  {}
                  {selectedMethod === 'upi' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-5"
                    >
                      <div>
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">UPI ID</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={e => setUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-accent-blue/40 transition-colors"
                        />
                      </div>
                      <p className="text-[9px] text-gray-700 font-bold">Enter any valid-looking UPI ID (e.g., test@upi)</p>
                    </motion.div>
                  )}

                  {}
                  {selectedMethod === 'netbanking' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6"
                    >
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Select Bank</p>
                      <div className="grid grid-cols-2 gap-3">
                        {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'].map(bank => (
                          <button
                            key={bank}
                            className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all text-left"
                          >
                            {bank}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-700 font-bold mt-4">Net banking is simulated — select any bank to proceed</p>
                    </motion.div>
                  )}

                  {}
                  <button
                    onClick={handlePayment}
                    disabled={!canPay}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 ${
                      canPay
                        ? 'bg-accent-pink text-white hover:bg-accent-pink/90 shadow-lg shadow-accent-pink/20 active:scale-[0.98]'
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Lock size={14} />
                    Pay ₹{finalTotal}
                  </button>
                </motion.div>
              )}

              {}
              {paymentStep === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-12 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center mb-6">
                    <Loader2 size={28} className="animate-spin text-accent-blue" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Processing Payment</h3>
                  <p className="text-sm text-gray-500 font-bold">Please do not close this page...</p>
                  <div className="mt-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              {}
              {paymentStep === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 150 }}
                    className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30"
                  >
                    <CheckCircle2 size={28} className="text-white" />
                  </motion.div>
                  <h3 className="text-xl font-black text-white mb-2">Payment Successful!</h3>
                  <p className="text-sm text-emerald-400 font-bold">Redirecting to your ticket...</p>
                </motion.div>
              )}

              {}
              {paymentStep === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/5 border border-red-500/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                    <AlertCircle size={28} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Payment Failed</h3>
                  <p className="text-sm text-red-400 font-bold mb-6">{errorMessage}</p>
                  <button
                    onClick={reset}
                    className="px-8 py-3 bg-white/10 border border-white/10 rounded-xl font-black text-sm text-white hover:bg-white/15 transition-all"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
};
