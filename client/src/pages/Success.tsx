import { Link, useLocation, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Ticket, Printer, Share2, Home } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export const Success = () => {
  useDocumentTitle("Booking Confirmed");
  const location = useLocation();
  const bookingData = location.state;

  if (!bookingData) return <Navigate to="/" replace />;

  const { movie, theatre, seats, total } = bookingData;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full"
      >
        <div className="bg-surface/30 backdrop-blur-3xl border border-white/10 rounded-[60px] overflow-hidden shadow-2xl">
          
          {}
          <div className="bg-green-500/20 py-12 flex flex-col items-center justify-center space-y-4 border-b border-white/5">
            <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ type: 'spring', damping: 10, stiffness: 100 }}
               className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40"
            >
              <CheckCircle2 size={40} className="text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Booking Successful!</h1>
            <p className="text-xs font-bold text-green-500 uppercase tracking-widest">Transaction ID: #CC-{Math.floor(Math.random() * 900000 + 100000)}</p>
          </div>

          {}
          <div className="p-12 space-y-8 relative">
            <Ticket size={120} className="absolute -right-10 -bottom-10 text-white/5 -rotate-12 pointer-events-none" />
            
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2">Movie</p>
                <h2 className="text-3xl font-black text-white leading-tight">{movie}</h2>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2">Theatre</p>
                  <p className="text-sm font-bold text-white">{theatre}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2">Seats</p>
                  <p className="text-sm font-black text-accent-blue">{seats.join(', ')}</p>
                </div>
              </div>

               <div className="pt-8 border-t border-dashed border-white/20 flex items-center justify-between">
                 <div className="flex items-center gap-4 text-gray-400">
                    <Printer size={20} className="hover:text-white cursor-pointer transition-colors" />
                    <Share2 size={20} className="hover:text-white cursor-pointer transition-colors" />
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Paid</p>
                    <p className="text-3xl font-black text-accent-pink tracking-tight">₹{total}</p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {}
        <div className="mt-12 flex flex-col sm:flex-row gap-6">
          <Link 
            to="/" 
            className="flex-1 px-10 py-5 bg-white/5 border border-white/10 rounded-[32px] text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
          >
            <Home size={18} /> Take Me Home
          </Link>
          <button className="flex-1 px-10 py-5 bg-accent-blue text-white rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent-blue/30">
            View My Bookings
          </button>
        </div>

      </motion.div>
    </div>
  );
};
