import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Ticket, Clock, QrCode } from 'lucide-react';
import { bookingsApi } from '../services/api/index.js';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO.js';
import { groupBookings } from '../utils/groupBookings.js';

export const MyBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.getMyBookings()
      .then(res => {
        setBookings(groupBookings(res.bookings));
      })
      .catch(err => console.error('Failed to fetch bookings:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 px-4 max-w-5xl mx-auto space-y-8">
        <div className="h-10 bg-white/5 rounded-2xl w-1/4 animate-pulse"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-white/5 rounded-[40px] animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 max-w-5xl mx-auto space-y-12">
      <SEO title="My Bookings" description="View and manage your past and upcoming movie ticket bookings." />

      <div className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
          My <span className="text-accent-blue">Bookings</span>
        </h1>
        <p className="text-gray-400 font-medium">View your tickets and booking history.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {bookings.length > 0 ? (
            bookings.map((booking, idx) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative bg-surface/40 backdrop-blur-3xl border border-white/5 rounded-[40px] overflow-hidden group hover:bg-surface/60 transition-all shadow-2xl"
              >
                {}
                <div className="absolute top-0 left-0 w-2 h-full bg-accent-blue" />

                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center">
                  {}
                  <div className="w-full md:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl flex-shrink-0">
                    <img
                      src={booking.showtimeId.movieId.posterUrl}
                      className="w-full h-full object-cover"
                      alt="Movie"
                    />
                  </div>

                  {}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <h3 className="text-2xl font-black text-white group-hover:text-accent-blue transition-colors">
                        {booking.showtimeId.movieId.title}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-1 text-sm text-gray-400 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2 text-accent-pink"><Clock size={14} /> {new Date(booking.showtimeId.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="flex items-center gap-2"><Calendar size={14} /> {new Date(booking.showtimeId.startTime).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-white font-black flex items-center justify-center md:justify-start gap-2">
                        <MapPin size={16} className="text-accent-blue" />
                        {booking.showtimeId.theatreId.name}
                      </p>
                      <p className="text-xs text-gray-500 font-medium italic">
                        {booking.showtimeId.theatreId.address}, {booking.showtimeId.theatreId.city}
                      </p>
                    </div>

                    <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5">
                      <div className="flex items-center gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Seats</p>
                          <p className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10 uppercase tracking-tighter">
                            {booking.seats.join(', ')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Price</p>
                          <p className="text-sm font-black text-accent-blue">₹{booking.totalPrice}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-2xl shadow-inner-white opacity-90 group-hover:opacity-100 transition-opacity">
                        <QrCode size={48} className="text-black" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 bg-white/5 rounded-[40px] border border-dashed border-white/10 text-center space-y-6">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <Ticket size={40} className="text-gray-600" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-white italic opacity-50">You haven't booked any movies yet.</p>
                <p className="text-gray-500 font-medium">Movies are better with friends! Grab some tickets now.</p>
              </div>
              <Link to="/" className="inline-block px-10 py-4 bg-accent-blue text-white rounded-2xl font-black hover:scale-105 transition-all">
                Browse Movies
              </Link>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
